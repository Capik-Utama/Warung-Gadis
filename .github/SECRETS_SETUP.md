# GitHub Actions - Supabase Migration Setup

## Required Secrets

To enable automatic database migrations, add these secrets in GitHub:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**

### Required Secrets:

| Secret Name | Description | How to get |
|-------------|-------------|------------|
| `SUPABASE_ACCESS_TOKEN` | Personal Access Token | https://app.supabase.com/account/tokens |
| `SUPABASE_PROJECT_REF` | Project reference ID | From project URL: `skockqyijvnmkbxwikry` |
| `SUPABASE_DB_PASSWORD` | Database password | Supabase Dashboard → Settings → Database |

## How It Works

1. When you push changes to `supabase/migrations/*.sql`, the workflow automatically runs
2. You can also trigger manually from GitHub Actions tab
3. Migrations are run via `supabase db push`

## Manual Trigger

1. Go to **Actions** tab
2. Select **Run Supabase Migration**
3. Click **Run workflow**
4. Optionally specify a migration file
