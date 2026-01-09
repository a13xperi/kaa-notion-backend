import { query } from '../db';

export interface LeadData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  projectAddress?: string;
  budgetRange: string;
  timeline: string;
  projectType: string;
  hasSurvey: boolean;
  hasDrawings: boolean;
  projectDescription?: string;
  recommendedTier: number;
  tierReason?: string;
  tierConfidence?: string;
  needsManualReview?: boolean;
}

export interface Lead extends LeadData {
  id: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LeadModel {
  /**
   * Create a new lead in the database
   */
  static async create(data: LeadData): Promise<Lead> {
    const result = await query<Lead>(
      `INSERT INTO leads (
        email, first_name, last_name, phone, project_address,
        budget_range, timeline, project_type, has_survey, has_drawings,
        project_description, recommended_tier, tier_reason, tier_confidence, needs_manual_review
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING
        id, email, first_name as "firstName", last_name as "lastName", phone,
        project_address as "projectAddress", budget_range as "budgetRange",
        timeline, project_type as "projectType", has_survey as "hasSurvey",
        has_drawings as "hasDrawings", project_description as "projectDescription",
        recommended_tier as "recommendedTier", tier_reason as "tierReason",
        tier_confidence as "tierConfidence", needs_manual_review as "needsManualReview",
        status, created_at as "createdAt", updated_at as "updatedAt"`,
      [
        data.email,
        data.firstName || null,
        data.lastName || null,
        data.phone || null,
        data.projectAddress || null,
        data.budgetRange,
        data.timeline,
        data.projectType,
        data.hasSurvey,
        data.hasDrawings,
        data.projectDescription || null,
        data.recommendedTier,
        data.tierReason || null,
        data.tierConfidence || null,
        data.needsManualReview || false,
      ]
    );

    return result.rows[0];
  }

  /**
   * Find a lead by ID
   */
  static async findById(id: number): Promise<Lead | null> {
    const result = await query<Lead>(
      `SELECT
        id, email, first_name as "firstName", last_name as "lastName", phone,
        project_address as "projectAddress", budget_range as "budgetRange",
        timeline, project_type as "projectType", has_survey as "hasSurvey",
        has_drawings as "hasDrawings", project_description as "projectDescription",
        recommended_tier as "recommendedTier", tier_reason as "tierReason",
        tier_confidence as "tierConfidence", needs_manual_review as "needsManualReview",
        status, created_at as "createdAt", updated_at as "updatedAt"
      FROM leads WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Find a lead by email
   */
  static async findByEmail(email: string): Promise<Lead | null> {
    const result = await query<Lead>(
      `SELECT
        id, email, first_name as "firstName", last_name as "lastName", phone,
        project_address as "projectAddress", budget_range as "budgetRange",
        timeline, project_type as "projectType", has_survey as "hasSurvey",
        has_drawings as "hasDrawings", project_description as "projectDescription",
        recommended_tier as "recommendedTier", tier_reason as "tierReason",
        tier_confidence as "tierConfidence", needs_manual_review as "needsManualReview",
        status, created_at as "createdAt", updated_at as "updatedAt"
      FROM leads WHERE email = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [email]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all leads that need manual review
   */
  static async findPendingReview(): Promise<Lead[]> {
    const result = await query<Lead>(
      `SELECT
        id, email, first_name as "firstName", last_name as "lastName", phone,
        project_address as "projectAddress", budget_range as "budgetRange",
        timeline, project_type as "projectType", has_survey as "hasSurvey",
        has_drawings as "hasDrawings", project_description as "projectDescription",
        recommended_tier as "recommendedTier", tier_reason as "tierReason",
        tier_confidence as "tierConfidence", needs_manual_review as "needsManualReview",
        status, created_at as "createdAt", updated_at as "updatedAt"
      FROM leads
      WHERE needs_manual_review = true AND status = 'new'
      ORDER BY created_at DESC`
    );

    return result.rows;
  }

  /**
   * Update lead status
   */
  static async updateStatus(id: number, status: string): Promise<Lead | null> {
    const result = await query<Lead>(
      `UPDATE leads
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING
        id, email, first_name as "firstName", last_name as "lastName", phone,
        project_address as "projectAddress", budget_range as "budgetRange",
        timeline, project_type as "projectType", has_survey as "hasSurvey",
        has_drawings as "hasDrawings", project_description as "projectDescription",
        recommended_tier as "recommendedTier", tier_reason as "tierReason",
        tier_confidence as "tierConfidence", needs_manual_review as "needsManualReview",
        status, created_at as "createdAt", updated_at as "updatedAt"`,
      [status, id]
    );

    return result.rows[0] || null;
  }

  /**
   * Update recommended tier (for manual review)
   */
  static async updateTier(
    id: number,
    tier: number,
    reason: string
  ): Promise<Lead | null> {
    const result = await query<Lead>(
      `UPDATE leads
       SET recommended_tier = $1, tier_reason = $2, needs_manual_review = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING
        id, email, first_name as "firstName", last_name as "lastName", phone,
        project_address as "projectAddress", budget_range as "budgetRange",
        timeline, project_type as "projectType", has_survey as "hasSurvey",
        has_drawings as "hasDrawings", project_description as "projectDescription",
        recommended_tier as "recommendedTier", tier_reason as "tierReason",
        tier_confidence as "tierConfidence", needs_manual_review as "needsManualReview",
        status, created_at as "createdAt", updated_at as "updatedAt"`,
      [tier, reason, id]
    );

    return result.rows[0] || null;
  }
}

export default LeadModel;
