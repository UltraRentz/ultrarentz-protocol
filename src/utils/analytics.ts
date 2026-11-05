// Analytics tracking for university pilot metrics
interface PilotMetrics {
  universityName: string;
  signUps: number;
  totalDeposits: number;
  averageDeposit: number;
  yieldEarned: number;
  retentionRate: number;
  referralCount: number;
}

interface UserMetrics {
  userId: string;
  university: string;
  signUpDate: Date;
  depositAmount: number;
  rentAmount: number;
  yieldEarned: number;
  lastActive: Date;
  referredBy?: string;
  referralCount?: number;
}

class PilotAnalytics {
  private metrics: Map<string, PilotMetrics> = new Map();
  private users: Map<string, UserMetrics> = new Map();

  // Track new user sign-up
  trackUserSignUp(userId: string, university: string, depositAmount: number) {
    const user: UserMetrics = {
      userId,
      university,
      signUpDate: new Date(),
      depositAmount,
      rentAmount: 0,
      yieldEarned: 0,
      lastActive: new Date()
    };

    this.users.set(userId, user);
    this.updateUniversityMetrics(university);
  }

  // Track rent payment
  trackRentPayment(userId: string, amount: number, cashbackEarned: number) {
    const user = this.users.get(userId);
    if (user) {
      user.rentAmount += amount;
      user.yieldEarned += cashbackEarned;
      user.lastActive = new Date();
      this.updateUniversityMetrics(user.university);
    }
  }

  // Track yield earned
  trackYieldEarned(userId: string, yieldAmount: number) {
    const user = this.users.get(userId);
    if (user) {
      user.yieldEarned += yieldAmount;
      user.lastActive = new Date();
      this.updateUniversityMetrics(user.university);
    }
  }

  // Track referral
  trackReferral(referrerId: string, referredId: string) {
    const referrer = this.users.get(referrerId);
    if (referrer) {
      referrer.referralCount = (referrer.referralCount || 0) + 1;
      this.updateUniversityMetrics(referrer.university);
    }
    
    // Track referred user
    const referred = this.users.get(referredId);
    if (referred) {
      referred.referredBy = referrerId;
    }
  }

  // Update university metrics
  private updateUniversityMetrics(university: string) {
    const universityUsers = Array.from(this.users.values()).filter(
      user => user.university === university
    );

    const totalDeposits = universityUsers.reduce((sum, user) => sum + user.depositAmount, 0);
    const totalYield = universityUsers.reduce((sum, user) => sum + user.yieldEarned, 0);
    const activeUsers = universityUsers.filter(user => 
      (Date.now() - user.lastActive.getTime()) < (30 * 24 * 60 * 60 * 1000) // 30 days
    ).length;

    const metrics: PilotMetrics = {
      universityName: university,
      signUps: universityUsers.length,
      totalDeposits,
      averageDeposit: totalDeposits / universityUsers.length || 0,
      yieldEarned: totalYield,
      retentionRate: (activeUsers / universityUsers.length) * 100 || 0,
      referralCount: universityUsers.reduce((sum, user) => sum + (user.referralCount || 0), 0)
    };

    this.metrics.set(university, metrics);
  }

  // Get university metrics
  getUniversityMetrics(university: string): PilotMetrics | undefined {
    return this.metrics.get(university);
  }

  // Get all metrics
  getAllMetrics(): PilotMetrics[] {
    return Array.from(this.metrics.values());
  }

  // Calculate growth metrics
  getGrowthMetrics() {
    const allMetrics = this.getAllMetrics();
    const totalSignUps = allMetrics.reduce((sum, metric) => sum + metric.signUps, 0);
    const totalDeposits = allMetrics.reduce((sum, metric) => sum + metric.totalDeposits, 0);
    const totalYield = allMetrics.reduce((sum, metric) => sum + metric.yieldEarned, 0);

    return {
      totalSignUps,
      totalDeposits,
      totalYield,
      averageDeposit: totalDeposits / totalSignUps || 0,
      averageYieldPerUser: totalYield / totalSignUps || 0
    };
  }

  // Export data for YC/Alliance applications
  exportForApplication() {
    const growth = this.getGrowthMetrics();
    const universityBreakdown = this.getAllMetrics();

    return {
      summary: {
        totalUsers: growth.totalSignUps,
        totalDeposits: `£${(growth.totalDeposits / 1000).toFixed(0)}K`,
        totalYield: `£${(growth.totalYield / 1000).toFixed(0)}K`,
        averageDeposit: `£${growth.averageDeposit.toFixed(0)}`,
        universities: universityBreakdown.length
      },
      universityBreakdown: universityBreakdown.map(metric => ({
        university: metric.universityName,
        users: metric.signUps,
        deposits: `£${(metric.totalDeposits / 1000).toFixed(0)}K`,
        averageDeposit: `£${metric.averageDeposit.toFixed(0)}`,
        yield: `£${(metric.yieldEarned / 1000).toFixed(0)}K`,
        retention: `${metric.retentionRate.toFixed(1)}%`,
        referrals: metric.referralCount
      })),
      growthStory: {
        month1: "41 users (Hertfordshire pilot)",
        month2: `~1,000 users (5 Leeds universities)`,
        month3: `~2,000 users (3 additional universities)`,
        month6: `~10,000 users (UK expansion)`,
        year1: `~50,000 users (International expansion)`
      }
    };
  }
}

export const pilotAnalytics = new PilotAnalytics();
export type { PilotMetrics, UserMetrics };
