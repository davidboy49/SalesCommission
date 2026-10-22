namespace SalesCommission.Domain.Entities;

// Transaction data. In the MVP it is generated as mock data; later it is fed by the DMS API.

public class SalesLine
{
    public long Id { get; set; }
    public required string InvoiceNo { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public int EmployeeId { get; set; }
    public int OutletId { get; set; }
    public int ProductId { get; set; }
    public decimal QuantityCases { get; set; }
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
}

public class ReturnLine
{
    public long Id { get; set; }
    public DateOnly ReturnDate { get; set; }
    public int EmployeeId { get; set; }
    public int OutletId { get; set; }
    public int ProductId { get; set; }
    public decimal QuantityCases { get; set; }
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
    public string? Reason { get; set; }
}

public class Collection
{
    public long Id { get; set; }
    public DateOnly CollectionDate { get; set; }
    public int EmployeeId { get; set; }
    public int OutletId { get; set; }
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
    public string? InvoiceNo { get; set; }
}

public class Visit
{
    public long Id { get; set; }
    public DateOnly VisitDate { get; set; }
    public int EmployeeId { get; set; }
    public int OutletId { get; set; }
    /// <summary>Visit was on the planned route for the day.</summary>
    public bool Planned { get; set; }
    /// <summary>Rep actually checked in at the outlet.</summary>
    public bool Visited { get; set; }
    /// <summary>Visit produced an order.</summary>
    public bool Productive { get; set; }
    /// <summary>Number of distinct SKUs sold on the visit.</summary>
    public int LinesSold { get; set; }
}

public class OutletAudit
{
    public long Id { get; set; }
    public DateOnly AuditDate { get; set; }
    public int EmployeeId { get; set; }
    public int OutletId { get; set; }
    /// <summary>Display / cooler / shelf standards met.</summary>
    public bool Compliant { get; set; }
}
