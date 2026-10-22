namespace SalesCommission.Domain;

public enum SalesRole
{
    PreSales,
    VanSales,
    KeyAccount,
    Merchandiser,
    Supervisor,
    Manager
}

public enum Currency
{
    USD,
    KHR
}

/// <summary>What a plan component measures. Rate KPIs are stored as fractions (0.85 = 85%).</summary>
public enum KpiType
{
    /// <summary>Cases sold.</summary>
    SalesVolumeCases,
    /// <summary>Sales value in the plan's payout currency.</summary>
    SalesRevenue,
    /// <summary>Distinct outlets with at least one sale in the period.</summary>
    ActiveOutlets,
    /// <summary>Distinct outlets whose first-ever sale falls in the period.</summary>
    NewOutlets,
    /// <summary>Collected amount ÷ net invoiced amount (rate).</summary>
    CollectionRate,
    /// <summary>Productive visits ÷ visits made (rate).</summary>
    StrikeRate,
    /// <summary>Product lines sold ÷ productive visits.</summary>
    LinesPerCall,
    /// <summary>Planned visits completed ÷ planned visits (rate).</summary>
    VisitCompliance,
    /// <summary>Compliant outlet audits ÷ audits done (rate).</summary>
    AuditCompliance
}

/// <summary>Which sales figure volume/revenue KPIs are based on.</summary>
public enum SalesBase
{
    Invoiced,
    NetOfReturns,
    /// <summary>Cash collected. Applies to revenue; volume falls back to net of returns.</summary>
    Collected
}

public enum PeriodStatus
{
    Open,
    Calculated,
    Locked
}

public static class KpiTypeExtensions
{
    public static bool IsRate(this KpiType kpi) => kpi is KpiType.CollectionRate
        or KpiType.StrikeRate or KpiType.VisitCompliance or KpiType.AuditCompliance;
}
