/**
 * Team Routes
 * API endpoints for team collaboration and management
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import * as teamService from '../services/teamService';
import { TeamRole } from '../types/prisma-types';

const router = Router();

// ============================================
// TEAM MEMBER ROUTES
// ============================================

/**
 * GET /api/team/members
 * Get all team members
 */
router.get('/members', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if user is a team member or admin
    const teamMember = await teamService.getTeamMemberByUserId(user.id);
    if (!teamMember && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const members = await teamService.getTeamMembers();
    res.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

/**
 * GET /api/team/members/me
 * Get current user's team membership
 */
router.get('/members/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const teamMember = await teamService.getTeamMemberByUserId(user.id);

    if (!teamMember) {
      return res.status(404).json({ error: 'Not a team member' });
    }

    const permissions = teamService.getRolePermissions(teamMember.role);
    res.json({ ...teamMember, permissions });
  } catch (error) {
    console.error('Error fetching team membership:', error);
    res.status(500).json({ error: 'Failed to fetch team membership' });
  }
});

/**
 * GET /api/team/members/:userId
 * Get a specific team member
 */
router.get('/members/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const teamMember = await teamService.getTeamMemberByUserId(userId);

    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    res.json(teamMember);
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({ error: 'Failed to fetch team member' });
  }
});

/**
 * POST /api/team/invite
 * Invite a new team member
 */
router.post('/invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check permission to invite
    const inviter = await teamService.getTeamMemberByUserId(user.id);
    if (!inviter || !teamService.hasPermission(inviter.role, 'manage_team')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { email, name, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    if (!['ADMIN', 'DESIGNER', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await teamService.inviteTeamMember({
      email,
      name,
      role: role as TeamRole,
      invitedById: user.id,
    });

    res.status(201).json({
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      teamMember: result.teamMember,
      inviteToken: result.inviteToken,
    });
  } catch (error: any) {
    console.error('Error inviting team member:', error);
    res.status(400).json({ error: error.message || 'Failed to invite team member' });
  }
});

/**
 * POST /api/team/accept-invite
 * Accept a team invitation
 */
router.post('/accept-invite', async (req: Request, res: Response) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password are required' });
    }

    const teamMember = await teamService.acceptInvite(userId, password);
    res.json(teamMember);
  } catch (error: any) {
    console.error('Error accepting invite:', error);
    res.status(400).json({ error: error.message || 'Failed to accept invitation' });
  }
});

/**
 * PUT /api/team/members/:userId/role
 * Update a team member's role
 */
router.put('/members/:userId/role', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['ADMIN', 'DESIGNER', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required' });
    }

    const teamMember = await teamService.updateTeamMemberRole(
      userId,
      role as TeamRole,
      user.id
    );

    res.json(teamMember);
  } catch (error: any) {
    console.error('Error updating role:', error);
    res.status(400).json({ error: error.message || 'Failed to update role' });
  }
});

/**
 * DELETE /api/team/members/:userId
 * Remove a team member
 */
router.delete('/members/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { userId } = req.params;

    await teamService.removeTeamMember(userId, user.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error removing team member:', error);
    res.status(400).json({ error: error.message || 'Failed to remove team member' });
  }
});

/**
 * POST /api/team/members/:userId/reactivate
 * Reactivate a removed team member
 */
router.post('/members/:userId/reactivate', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { userId } = req.params;

    // Check permission
    const admin = await teamService.getTeamMemberByUserId(user.id);
    if (!admin || !teamService.hasPermission(admin.role, 'manage_team')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const teamMember = await teamService.reactivateTeamMember(userId);
    res.json(teamMember);
  } catch (error: any) {
    console.error('Error reactivating team member:', error);
    res.status(400).json({ error: error.message || 'Failed to reactivate team member' });
  }
});

// ============================================
// PROJECT ASSIGNMENT ROUTES
// ============================================

/**
 * GET /api/team/projects/:projectId/team
 * Get team members assigned to a project
 */
router.get('/projects/:projectId/team', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { projectId } = req.params;

    // Check if user has access to project
    const hasAccess = await teamService.hasProjectAccess(user.id, projectId);
    if (!hasAccess && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const team = await teamService.getProjectTeam(projectId);
    res.json(team);
  } catch (error) {
    console.error('Error fetching project team:', error);
    res.status(500).json({ error: 'Failed to fetch project team' });
  }
});

/**
 * POST /api/team/projects/:projectId/assign
 * Assign a team member to a project
 */
router.post('/projects/:projectId/assign', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { projectId } = req.params;
    const { userId, role } = req.body;

    // Check permission
    const admin = await teamService.getTeamMemberByUserId(user.id);
    if (!admin || !teamService.hasPermission(admin.role, 'assign_team')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    await teamService.assignToProject({ projectId, userId, role });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error assigning to project:', error);
    res.status(400).json({ error: error.message || 'Failed to assign to project' });
  }
});

/**
 * DELETE /api/team/projects/:projectId/assign/:userId
 * Unassign a team member from a project
 */
router.delete('/projects/:projectId/assign/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { projectId, userId } = req.params;

    // Check permission
    const admin = await teamService.getTeamMemberByUserId(user.id);
    if (!admin || !teamService.hasPermission(admin.role, 'assign_team')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await teamService.unassignFromProject(projectId, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error unassigning from project:', error);
    res.status(400).json({ error: error.message || 'Failed to unassign from project' });
  }
});

/**
 * GET /api/team/members/:userId/projects
 * Get projects assigned to a team member
 */
router.get('/members/:userId/projects', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const projects = await teamService.getMemberProjects(userId);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching member projects:', error);
    res.status(500).json({ error: 'Failed to fetch member projects' });
  }
});

// ============================================
// PERMISSIONS
// ============================================

/**
 * GET /api/team/permissions/:role
 * Get permissions for a role
 */
router.get('/permissions/:role', requireAuth, async (req: Request, res: Response) => {
  try {
    const { role } = req.params;

    if (!['OWNER', 'ADMIN', 'DESIGNER', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const permissions = teamService.getRolePermissions(role as TeamRole);
    res.json({ role, permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * GET /api/team/permissions
 * Get all role permissions
 */
router.get('/permissions', requireAuth, async (req: Request, res: Response) => {
  try {
    res.json(teamService.ROLE_PERMISSIONS);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// ============================================
// TEAM STATISTICS
// ============================================

/**
 * GET /api/team/stats
 * Get team statistics
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if user has access
    const teamMember = await teamService.getTeamMemberByUserId(user.id);
    if (!teamMember && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await teamService.getTeamStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ error: 'Failed to fetch team statistics' });
  }
});

export default router;
