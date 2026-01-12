/**
 * Manual mock for @prisma/client
 */

const mockPrismaClient = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
  $queryRawUnsafe: jest.fn().mockResolvedValue([{ result: 1 }]),
  $executeRaw: jest.fn().mockResolvedValue(1),
  $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  $on: jest.fn(),
  $transaction: jest.fn().mockImplementation((fn: any) => fn(mockPrismaClient)),
  $use: jest.fn(),
  $extends: jest.fn().mockReturnThis(),
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  client: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  lead: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  milestone: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  deliverable: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  payment: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
};

export const PrismaClient = jest.fn(() => mockPrismaClient);

// Type placeholders for Prisma types
type SelectType = Record<string, boolean | { select?: SelectType; include?: SelectType }>;
type IncludeType = Record<string, boolean | { select?: SelectType; include?: IncludeType }>;
type WhereInputType = Record<string, unknown>;
type LogLevel = 'info' | 'query' | 'warn' | 'error';
type LogDefinition = { level: LogLevel; emit: 'stdout' | 'event' };

// Export namespace types for satisfies constraints
export namespace Prisma {
  export type UserSelect = SelectType;
  export type ProjectSelect = SelectType;
  export type ClientSelect = SelectType;
  export type LeadSelect = SelectType;
  export type MilestoneSelect = SelectType;
  export type DeliverableSelect = SelectType;
  export type NotificationSelect = SelectType;
  export type MessageSelect = SelectType;
  export type PaymentSelect = SelectType;
  export type ProjectInclude = IncludeType;
  export type ClientInclude = IncludeType;
  export type UserInclude = IncludeType;
  export type LeadInclude = IncludeType;
  export type ClientWhereInput = WhereInputType;
  export type UserWhereInput = WhereInputType;
  export type ProjectWhereInput = WhereInputType;
  export type LeadWhereInput = WhereInputType;
  export type PrismaClientOptions = {
    log?: Array<LogLevel | LogDefinition>;
    datasources?: Record<string, { url?: string }>;
    errorFormat?: 'pretty' | 'colorless' | 'minimal';
  };
  export type TransactionIsolationLevel = 'ReadCommitted' | 'Serializable' | 'RepeatableRead' | 'ReadUncommitted';
  export const TransactionIsolationLevel = {
    ReadCommitted: 'ReadCommitted' as const,
    Serializable: 'Serializable' as const,
    RepeatableRead: 'RepeatableRead' as const,
    ReadUncommitted: 'ReadUncommitted' as const,
  };
  export class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: object;
    constructor(message: string, { code, meta }: { code: string; meta?: object }) {
      super(message);
      this.code = code;
      this.meta = meta;
      this.name = 'PrismaClientKnownRequestError';
    }
  }
  export class PrismaClientUnknownRequestError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PrismaClientUnknownRequestError';
    }
  }
  export class PrismaClientRustPanicError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PrismaClientRustPanicError';
    }
  }
  export class PrismaClientInitializationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PrismaClientInitializationError';
    }
  }
  export class PrismaClientValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PrismaClientValidationError';
    }
  }
}

export default { PrismaClient, Prisma };
