-- Priority 10 Future Enhancements Migration
-- This migration creates tables for:
-- - Team Collaboration (TeamMember, ProjectAssignment)
-- - Subscription Billing (Subscription)
-- - Referral System (Referral, ReferralCredit)
-- - Portfolio Gallery (PortfolioProject, PortfolioImage)

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'DESIGNER', 'VIEWER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED', 'TRIALING');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'CLICKED', 'SIGNED_UP', 'CONVERTED', 'REWARDED', 'EXPIRED');

-- AlterTable: Add new columns to clients
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "max_projects" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "referral_code" TEXT;

-- AlterTable: Add new column to projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

-- CreateTable: team_members
CREATE TABLE IF NOT EXISTS "team_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'DESIGNER',
    "invited_by_id" TEXT,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable: project_assignments
CREATE TABLE IF NOT EXISTS "project_assignments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'contributor',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "stripe_product_id" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: referrals
CREATE TABLE IF NOT EXISTS "referrals" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "referred_email" TEXT,
    "referred_client_id" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "reward_amount" INTEGER,
    "reward_type" TEXT,
    "clicked_at" TIMESTAMP(3),
    "signed_up_at" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "rewarded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: referral_credits
CREATE TABLE IF NOT EXISTS "referral_credits" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "referral_id" TEXT,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "used_amount" INTEGER NOT NULL DEFAULT 0,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable: portfolio_projects
CREATE TABLE IF NOT EXISTS "portfolio_projects" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" TEXT,
    "location" TEXT,
    "project_type" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "seo_title" TEXT,
    "seo_description" TEXT,
    "seo_keywords" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: portfolio_images
CREATE TABLE IF NOT EXISTS "portfolio_images" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "alt" TEXT,
    "caption" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "clients_referral_code_key" ON "clients"("referral_code");
CREATE INDEX IF NOT EXISTS "clients_referral_code_idx" ON "clients"("referral_code");

CREATE INDEX IF NOT EXISTS "projects_archived_at_idx" ON "projects"("archived_at");

CREATE UNIQUE INDEX IF NOT EXISTS "team_members_user_id_key" ON "team_members"("user_id");
CREATE INDEX IF NOT EXISTS "team_members_user_id_idx" ON "team_members"("user_id");
CREATE INDEX IF NOT EXISTS "team_members_role_idx" ON "team_members"("role");

CREATE UNIQUE INDEX IF NOT EXISTS "project_assignments_project_id_user_id_key" ON "project_assignments"("project_id", "user_id");
CREATE INDEX IF NOT EXISTS "project_assignments_project_id_idx" ON "project_assignments"("project_id");
CREATE INDEX IF NOT EXISTS "project_assignments_user_id_idx" ON "project_assignments"("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_client_id_key" ON "subscriptions"("client_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "subscriptions_client_id_idx" ON "subscriptions"("client_id");
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_idx" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referred_client_id_key" ON "referrals"("referred_client_id");
CREATE INDEX IF NOT EXISTS "referrals_referrer_id_idx" ON "referrals"("referrer_id");
CREATE INDEX IF NOT EXISTS "referrals_referral_code_idx" ON "referrals"("referral_code");
CREATE INDEX IF NOT EXISTS "referrals_referred_email_idx" ON "referrals"("referred_email");
CREATE INDEX IF NOT EXISTS "referrals_status_idx" ON "referrals"("status");

CREATE INDEX IF NOT EXISTS "referral_credits_client_id_idx" ON "referral_credits"("client_id");
CREATE INDEX IF NOT EXISTS "referral_credits_expires_at_idx" ON "referral_credits"("expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_projects_project_id_key" ON "portfolio_projects"("project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_projects_slug_key" ON "portfolio_projects"("slug");
CREATE INDEX IF NOT EXISTS "portfolio_projects_slug_idx" ON "portfolio_projects"("slug");
CREATE INDEX IF NOT EXISTS "portfolio_projects_published_idx" ON "portfolio_projects"("published");
CREATE INDEX IF NOT EXISTS "portfolio_projects_featured_idx" ON "portfolio_projects"("featured");
CREATE INDEX IF NOT EXISTS "portfolio_projects_project_type_idx" ON "portfolio_projects"("project_type");

CREATE INDEX IF NOT EXISTS "portfolio_images_portfolio_id_idx" ON "portfolio_images"("portfolio_id");
CREATE INDEX IF NOT EXISTS "portfolio_images_is_cover_idx" ON "portfolio_images"("is_cover");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_client_id_fkey" FOREIGN KEY ("referred_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referral_credits" ADD CONSTRAINT "referral_credits_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
