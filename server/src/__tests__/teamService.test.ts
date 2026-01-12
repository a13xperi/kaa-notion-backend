/**
 * Team Service Tests
 * Tests for team invites and acceptance flows.
 */

import crypto from 'crypto';
import { inviteTeamMember, acceptInvite } from '../services/teamService';
import { mockPrisma } from './setup';
import { hashPassword } from '../services/authService';
import { sendEmail } from '../services/emailService';

jest.mock('../services/authService', () => ({
  hashPassword: jest.fn(),
}));

jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn(),
}));

describe('teamService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores hashed temporary password and invite token on invite', async () => {
    const randomBytesSpy = jest.spyOn(crypto, 'randomBytes');
    const tempPasswordBuffer = Buffer.from('temp-password');
    const inviteTokenBuffer = Buffer.from('invite-token');

    randomBytesSpy
      .mockReturnValueOnce(tempPasswordBuffer)
      .mockReturnValueOnce(inviteTokenBuffer);

    (hashPassword as jest.Mock).mockResolvedValue('hashed-temp');
    (sendEmail as jest.Mock).mockResolvedValue({ success: true });

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'invitee@example.com',
      name: 'Invitee',
    });
    mockPrisma.teamMember.create.mockResolvedValue({
      id: 'team-1',
      userId: 'user-1',
      role: 'DESIGNER',
    });

    const result = await inviteTeamMember({
      email: 'invitee@example.com',
      name: 'Invitee',
      role: 'DESIGNER',
      invitedById: 'inviter-1',
    });

    const expectedTempPassword = tempPasswordBuffer.toString('hex');
    const expectedInviteToken = inviteTokenBuffer.toString('hex');

    expect(hashPassword).toHaveBeenCalledWith(expectedTempPassword);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: 'hashed-temp',
        }),
      })
    );
    expect(mockPrisma.teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inviteToken: expectedInviteToken,
          inviteTokenExpiresAt: expect.any(Date),
        }),
      })
    );
    expect(sendEmail).toHaveBeenCalled();
    expect(result.inviteToken).toBe(expectedInviteToken);

    randomBytesSpy.mockRestore();
  });

  it('accepts a valid invite token and hashes the password', async () => {
    const inviteTokenExpiresAt = new Date(Date.now() + 60_000);

    mockPrisma.teamMember.findUnique.mockResolvedValue({
      userId: 'user-1',
      acceptedAt: null,
      inviteToken: 'valid-token',
      inviteTokenExpiresAt,
    });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.teamMember.update.mockResolvedValue({
      userId: 'user-1',
      acceptedAt: new Date(),
    });

    (hashPassword as jest.Mock).mockResolvedValue('hashed-password');

    await acceptInvite('user-1', 'SecurePass123!', 'valid-token');

    expect(hashPassword).toHaveBeenCalledWith('SecurePass123!');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { passwordHash: 'hashed-password' },
      })
    );
    expect(mockPrisma.teamMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          acceptedAt: expect.any(Date),
          inviteToken: null,
          inviteTokenExpiresAt: null,
        }),
      })
    );
  });

  it('rejects an invalid invite token', async () => {
    mockPrisma.teamMember.findUnique.mockResolvedValue({
      userId: 'user-1',
      acceptedAt: null,
      inviteToken: 'valid-token',
      inviteTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      acceptInvite('user-1', 'SecurePass123!', 'invalid-token')
    ).rejects.toThrow('Invalid invite token');
  });

  it('rejects an expired invite token', async () => {
    mockPrisma.teamMember.findUnique.mockResolvedValue({
      userId: 'user-1',
      acceptedAt: null,
      inviteToken: 'valid-token',
      inviteTokenExpiresAt: new Date(Date.now() - 60_000),
    });

    await expect(
      acceptInvite('user-1', 'SecurePass123!', 'valid-token')
    ).rejects.toThrow('Invite token has expired');
  });
});
