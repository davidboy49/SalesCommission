namespace SalesCommission.Domain.Entities;

public class Period
{
    public int Id { get; set; }
    /// <summary>yyyy-MM, e.g. 2026-09.</summary>
    public required string Code { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public PeriodStatus Status { get; set; } = PeriodStatus.Open;
    /// <summary>Exchange rate used for USD/KHR conversion in this period.</summary>
    public decimal KhrPerUsd { get; set; }

    public static Period ForMonth(int year, int month, decimal khrPerUsd)
    {
        var start = new DateOnly(year, month, 1);
        return new Period
        {
            Code = $"{year:D4}-{month:D2}",
            Year = year,
            Month = month,
            StartDate = start,
            EndDate = start.AddMonths(1).AddDays(-1),
            KhrPerUsd = khrPerUsd
        };
    }
}

public class Target
{
    public int Id { get; set; }
    public int PeriodId { get; set; }
    public int EmployeeId { get; set; }
    public KpiType KpiType { get; set; }
    public int? ProductGroupId { get; set; }
    /// <summary>Target value in the KPI's unit (cases, plan currency, outlets, or a fraction for rates).</summary>
    public decimal Value { get; set; }
}
