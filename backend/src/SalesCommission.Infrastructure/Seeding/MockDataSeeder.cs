using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SalesCommission.Domain;
using SalesCommission.Domain.Entities;
using SalesCommission.Infrastructure.Persistence;

namespace SalesCommission.Infrastructure.Seeding;

/// <summary>
/// Generates a repeatable demo dataset (fixed random seed). Names, outlets and sales are fictional.
/// Replaced later by the DMS and HR integrations.
/// </summary>
public class MockDataSeeder(AppDbContext db, UserManager<AppUser> users, RoleManager<IdentityRole> roles, IConfiguration config)
{
    private static readonly (int Year, int Month, decimal Rate)[] Months = [(2026, 7, 4100m), (2026, 8, 4090m), (2026, 9, 4105m)];
    private static readonly string[] FirstNames = ["Sokha", "Vannak", "Dara", "Sreymom", "Rithy", "Chanthy", "Bopha", "Visal", "Sopheak", "Kunthea", "Piseth", "Malis", "Vibol", "Sreyneang", "Samnang"];
    private static readonly string[] LastNames = ["Chea", "Sok", "Heng", "Kim", "Lim", "Ly", "Meas", "Pich", "Sam", "Tep", "Van", "Yin"];

    private readonly Random _rnd = new(2026);

    public async Task SeedAsync(CancellationToken ct = default)
    {
        await db.Database.MigrateAsync(ct);
        if (await db.Employees.AnyAsync(ct))
            return;

        // All-or-nothing: a failed seed must not leave partial data that the next start would mistake for a finished one.
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        db.ChangeTracker.AutoDetectChangesEnabled = false;

        var regions = new[] { "Phnom Penh", "Siem Reap", "Battambang", "Sihanoukville" }
            .Select((n, i) => new Region { Code = $"R{i + 1}", Name = n }).ToList();
        var channels = new[] { ("GT", "General Trade"), ("MT", "Modern Trade"), ("HRC", "HoReCa"), ("WS", "Wholesale") }
            .Select(c => new Channel { Code = c.Item1, Name = c.Item2 }).ToList();
        var groups = new[] { ("ENG", "Energy Drinks"), ("CSD", "Carbonated"), ("WAT", "Water"), ("JUI", "Juice") }
            .Select(g => new ProductGroup { Code = g.Item1, Name = g.Item2 }).ToList();
        db.AddRange(regions);
        db.AddRange(channels);
        db.AddRange(groups);
        await db.SaveChangesAsync(ct);

        var gt = channels[0]; var mt = channels[1]; var hrc = channels[2]; var ws = channels[3];
        var energy = groups[0];

        var products = new (string Sku, string Name, ProductGroup Group, int Units, decimal Price)[]
        {
            ("ENG-250", "Energy Drink 250ml", groups[0], 24, 12m),
            ("ENG-500", "Energy Drink 500ml", groups[0], 12, 11m),
            ("CSD-330", "Cola Can 330ml", groups[1], 24, 14m),
            ("CSD-1500", "Cola 1.5L", groups[1], 6, 9m),
            ("CSD-LIM", "Lemon Soda 330ml", groups[1], 24, 8m),
            ("WAT-500", "Water 500ml", groups[2], 24, 4.5m),
            ("WAT-1500", "Water 1.5L", groups[2], 12, 5.5m),
            ("JUI-250", "Orange Juice 250ml", groups[3], 24, 10m)
        }.Select(p => new Product
        {
            Sku = p.Sku, Name = p.Name, ProductGroupId = p.Group.Id, UnitsPerCase = p.Units, PricePerCaseUsd = p.Price
        }).ToList();
        db.AddRange(products);

        var periods = Months.Select(m => Period.ForMonth(m.Year, m.Month, m.Rate)).ToList();
        db.AddRange(periods);
        await db.SaveChangesAsync(ct);

        var (employees, skill) = await CreateTeamAsync(regions, gt, mt, hrc, ws, ct);
        var outlets = await CreateOutletsAsync(employees, regions, channels, ct);
        await CreatePlansAsync(regions[0], energy, ct);

        foreach (var period in periods)
        {
            await GenerateActivityAsync(period, employees, outlets, products, skill, ct);
            CreateTargets(period, employees, energy);
            await db.SaveChangesAsync(ct);
        }

        await CreateUsersAsync(employees, ct);
        await transaction.CommitAsync(ct);
    }

    // ---------- team ----------

    private async Task<(List<Employee> Employees, Dictionary<int, double> Skill)> CreateTeamAsync(
        List<Region> regions, Channel gt, Channel mt, Channel hrc, Channel ws, CancellationToken ct)
    {
        var all = new List<Employee>();
        var skill = new Dictionary<int, double>();
        var managers = new List<Employee>();
        var n = 0;

        foreach (var region in regions)
        {
            var manager = new Employee
            {
                Code = $"M{managers.Count + 1:00}", FullName = Name(), Role = SalesRole.Manager,
                RegionId = region.Id, HireDate = new DateOnly(2019, 3, 1)
            };
            managers.Add(manager);
            all.Add(manager);
        }
        db.AddRange(managers);
        await db.SaveChangesAsync(ct);

        var supervisors = new List<Employee>();
        foreach (var manager in managers)
            for (var s = 0; s < 2; s++)
            {
                var sup = new Employee
                {
                    Code = $"S{supervisors.Count + 1:00}", FullName = Name(), Role = SalesRole.Supervisor,
                    RegionId = manager.RegionId, ManagerId = manager.Id, HireDate = new DateOnly(2021, 1, 1)
                };
                supervisors.Add(sup);
            }
        db.AddRange(supervisors);
        await db.SaveChangesAsync(ct);
        all.AddRange(supervisors);

        SalesRole[] mix = [SalesRole.PreSales, SalesRole.PreSales, SalesRole.PreSales, SalesRole.VanSales, SalesRole.VanSales,
            SalesRole.KeyAccount, SalesRole.Merchandiser];
        var reps = new List<Employee>();
        foreach (var sup in supervisors)
            foreach (var role in mix)
            {
                var channel = role switch
                {
                    SalesRole.KeyAccount => n % 2 == 0 ? mt : hrc,
                    SalesRole.Merchandiser => mt,
                    SalesRole.VanSales => n % 2 == 0 ? gt : ws,
                    _ => gt
                };
                reps.Add(new Employee
                {
                    Code = $"R{++n:000}", FullName = Name(), Role = role, RegionId = sup.RegionId, ChannelId = channel.Id,
                    ManagerId = sup.Id, Phone = $"0{_rnd.Next(10, 99)} {_rnd.Next(100, 999)} {_rnd.Next(100, 999)}",
                    HireDate = new DateOnly(2022, 1, 1).AddDays(_rnd.Next(0, 1000))
                });
            }
        db.AddRange(reps);
        await db.SaveChangesAsync(ct);
        all.AddRange(reps);
        foreach (var rep in reps)
            skill[rep.Id] = 0.78 + _rnd.NextDouble() * 0.42;
        return (all, skill);
    }

    private string Name() => $"{FirstNames[_rnd.Next(FirstNames.Length)]} {LastNames[_rnd.Next(LastNames.Length)]}";

    // ---------- outlets ----------

    private async Task<Dictionary<int, List<Outlet>>> CreateOutletsAsync(
        List<Employee> employees, List<Region> regions, List<Channel> channels, CancellationToken ct)
    {
        var result = new Dictionary<int, List<Outlet>>();
        var all = new List<Outlet>();
        var seq = 0;
        foreach (var rep in employees.Where(e => e.Role is SalesRole.PreSales or SalesRole.VanSales or SalesRole.KeyAccount or SalesRole.Merchandiser))
        {
            var (existing, perMonth) = rep.Role switch
            {
                SalesRole.KeyAccount => (6, 1),
                SalesRole.Merchandiser => (12, 0),
                _ => (20, 2)
            };
            var list = new List<Outlet>();
            for (var i = 0; i < existing + perMonth * Months.Length; i++)
            {
                var opened = i < existing
                    ? new DateOnly(2025, 1, 1).AddDays(_rnd.Next(0, 400))
                    : new DateOnly(Months[(i - existing) / perMonth].Year, Months[(i - existing) / perMonth].Month, _rnd.Next(1, 21));
                list.Add(new Outlet
                {
                    Code = $"O{++seq:00000}", Name = $"{OutletKind(rep)} {seq}", ChannelId = rep.ChannelId ?? channels[0].Id,
                    RegionId = rep.RegionId, AssignedEmployeeId = rep.Id, OpenedOn = opened
                });
            }
            result[rep.Id] = list;
            all.AddRange(list);
        }
        db.AddRange(all);
        await db.SaveChangesAsync(ct);
        return result;
    }

    private static string OutletKind(Employee rep) => rep.Role switch
    {
        SalesRole.KeyAccount => "Supermarket",
        SalesRole.Merchandiser => "Mart",
        SalesRole.VanSales => "Mini Shop",
        _ => "Shop"
    };

    // ---------- plans ----------

    private async Task CreatePlansAsync(Region phnomPenh, ProductGroup energy, CancellationToken ct)
    {
        static List<PayoutTier> Standard() =>
            [new() { Achievement = 0.8m, PayoutFactor = 0.5m }, new() { Achievement = 1.0m, PayoutFactor = 1.0m }, new() { Achievement = 1.2m, PayoutFactor = 1.5m }];
        static List<PayoutTier> Steps() =>
            [new() { Achievement = 0.5m, PayoutFactor = 0.5m }, new() { Achievement = 1.0m, PayoutFactor = 1.0m }, new() { Achievement = 1.5m, PayoutFactor = 1.25m }];

        PlanComponent C(string name, KpiType kpi, decimal weight, int order, SalesBase sb = SalesBase.NetOfReturns,
            int? group = null, bool interpolate = true, List<PayoutTier>? tiers = null) => new()
        {
            Name = name, KpiType = kpi, Weight = weight, SortOrder = order, SalesBase = sb, ProductGroupId = group,
            Interpolate = interpolate, Tiers = tiers ?? Standard()
        };

        List<PlanComponent> PreSalesComponents() =>
        [
            C("Sales volume (cases)", KpiType.SalesVolumeCases, 0.35m, 1),
            C("Energy drinks volume", KpiType.SalesVolumeCases, 0.15m, 2, group: energy.Id),
            C("Active outlets", KpiType.ActiveOutlets, 0.15m, 3),
            C("New outlets opened", KpiType.NewOutlets, 0.10m, 4, interpolate: false, tiers: Steps()),
            C("Strike rate", KpiType.StrikeRate, 0.15m, 5),
            C("Lines per call", KpiType.LinesPerCall, 0.10m, 6)
        ];

        var from = new DateOnly(2026, 1, 1);
        db.Plans.AddRange(
            new CommissionPlan
            {
                Code = "PRESALES", Name = "Pre-sales rep", Description = "Standard pre-sales plan. Needs 85% collection to pay.",
                Role = SalesRole.PreSales, EffectiveFrom = from, PayoutCurrency = Currency.USD, TargetIncentive = 250m,
                GateKpi = KpiType.CollectionRate, GateMinValue = 0.85m, Components = PreSalesComponents()
            },
            new CommissionPlan
            {
                Code = "PRESALES-PP", Name = "Pre-sales rep – Phnom Penh", Description = "Higher target incentive for the capital.",
                Role = SalesRole.PreSales, RegionId = phnomPenh.Id, EffectiveFrom = from, PayoutCurrency = Currency.USD,
                TargetIncentive = 300m, GateKpi = KpiType.CollectionRate, GateMinValue = 0.85m, Components = PreSalesComponents()
            },
            new CommissionPlan
            {
                Code = "VAN", Name = "Van sales rep", Description = "Paid in riel. Revenue counts cash actually collected.",
                Role = SalesRole.VanSales, EffectiveFrom = from, PayoutCurrency = Currency.KHR, TargetIncentive = 1_000_000m,
                Components =
                [
                    C("Collected revenue", KpiType.SalesRevenue, 0.40m, 1, sb: SalesBase.Collected),
                    C("Sales volume (cases)", KpiType.SalesVolumeCases, 0.20m, 2),
                    C("Active outlets", KpiType.ActiveOutlets, 0.15m, 3),
                    C("Collection rate", KpiType.CollectionRate, 0.15m, 4),
                    C("Visit compliance", KpiType.VisitCompliance, 0.10m, 5)
                ]
            },
            new CommissionPlan
            {
                Code = "KEYACCOUNT", Name = "Key account rep", Description = "Large-customer plan. Needs 90% collection to pay.",
                Role = SalesRole.KeyAccount, EffectiveFrom = from, PayoutCurrency = Currency.USD, TargetIncentive = 400m,
                GateKpi = KpiType.CollectionRate, GateMinValue = 0.90m,
                Components =
                [
                    C("Net revenue", KpiType.SalesRevenue, 0.50m, 1),
                    C("Energy drinks volume", KpiType.SalesVolumeCases, 0.15m, 2, group: energy.Id),
                    C("Collection rate", KpiType.CollectionRate, 0.20m, 3),
                    C("Audit compliance", KpiType.AuditCompliance, 0.15m, 4)
                ]
            },
            new CommissionPlan
            {
                Code = "MERCH", Name = "Merchandiser", Description = "Execution-only plan: visits and display compliance.",
                Role = SalesRole.Merchandiser, EffectiveFrom = from, PayoutCurrency = Currency.USD, TargetIncentive = 120m,
                Components =
                [
                    C("Visit compliance", KpiType.VisitCompliance, 0.50m, 1),
                    C("Audit compliance", KpiType.AuditCompliance, 0.50m, 2)
                ]
            });
        await db.SaveChangesAsync(ct);
    }

    // ---------- targets ----------

    private void CreateTargets(Period period, List<Employee> employees, ProductGroup energy)
    {
        foreach (var rep in employees)
        {
            (KpiType Kpi, int? Group, decimal Value)[] values = rep.Role switch
            {
                SalesRole.PreSales =>
                [
                    (KpiType.SalesVolumeCases, null, 1000m), (KpiType.SalesVolumeCases, energy.Id, 250m),
                    (KpiType.ActiveOutlets, null, 18m), (KpiType.NewOutlets, null, 2m),
                    (KpiType.StrikeRate, null, 0.60m), (KpiType.LinesPerCall, null, 2.0m)
                ],
                SalesRole.VanSales =>
                [
                    (KpiType.SalesRevenue, null, 70_000_000m), (KpiType.SalesVolumeCases, null, 1700m),
                    (KpiType.ActiveOutlets, null, 18m), (KpiType.CollectionRate, null, 0.97m),
                    (KpiType.VisitCompliance, null, 0.92m)
                ],
                SalesRole.KeyAccount =>
                [
                    (KpiType.SalesRevenue, null, 80_000m), (KpiType.SalesVolumeCases, energy.Id, 2000m),
                    (KpiType.CollectionRate, null, 0.92m), (KpiType.AuditCompliance, null, 0.80m)
                ],
                SalesRole.Merchandiser =>
                [
                    (KpiType.VisitCompliance, null, 0.92m), (KpiType.AuditCompliance, null, 0.78m)
                ],
                _ => []
            };
            foreach (var v in values)
                db.Targets.Add(new Target { PeriodId = period.Id, EmployeeId = rep.Id, KpiType = v.Kpi, ProductGroupId = v.Group, Value = v.Value });
        }
    }

    // ---------- activity ----------

    private async Task GenerateActivityAsync(Period period, List<Employee> employees, Dictionary<int, List<Outlet>> outlets,
        List<Product> products, Dictionary<int, double> skill, CancellationToken ct)
    {
        var rate = period.KhrPerUsd;
        var invoiceSeq = 0;

        foreach (var rep in employees.Where(e => outlets.ContainsKey(e.Id)))
        {
            var s = skill[rep.Id];
            var myOutlets = outlets[rep.Id];
            var pointer = 0;
            var collectProbability = rep.Role == SalesRole.VanSales ? 0.99 : Math.Min(1.0, 0.72 + 0.22 * s);

            for (var day = period.StartDate; day <= period.EndDate; day = day.AddDays(1))
            {
                if (day.DayOfWeek == DayOfWeek.Sunday)
                    continue;
                var open = myOutlets.Where(o => o.OpenedOn <= day).ToList();
                if (open.Count == 0)
                    continue;

                var perDay = rep.Role switch { SalesRole.KeyAccount => 5, SalesRole.Merchandiser => 8, _ => 12 };
                var visitedP = Math.Min(0.98, 0.85 + 0.10 * s);
                var productiveP = rep.Role switch
                {
                    SalesRole.KeyAccount => Math.Min(0.95, 0.75 * s),
                    SalesRole.VanSales => 0.60 * s,
                    _ => 0.55 * s
                };

                for (var v = 0; v < perDay; v++)
                {
                    var outlet = open[pointer++ % open.Count];
                    var visited = _rnd.NextDouble() < visitedP;

                    if (rep.Role == SalesRole.Merchandiser)
                    {
                        db.Visits.Add(new Visit { VisitDate = day, EmployeeId = rep.Id, OutletId = outlet.Id, Planned = true, Visited = visited });
                        if (visited)
                            db.OutletAudits.Add(new OutletAudit
                            {
                                AuditDate = day, EmployeeId = rep.Id, OutletId = outlet.Id,
                                Compliant = _rnd.NextDouble() < Math.Min(0.95, 0.75 * s)
                            });
                        continue;
                    }

                    var productive = visited && _rnd.NextDouble() < productiveP;
                    var lineCount = 0;
                    if (productive)
                    {
                        lineCount = rep.Role == SalesRole.KeyAccount ? _rnd.Next(2, 5) : _rnd.Next(1, 4);
                        var chosen = products.OrderBy(_ => _rnd.Next()).Take(lineCount).ToList();
                        var invoiceNo = $"INV-{day:yyMMdd}-{rep.Code}-{++invoiceSeq}";
                        var invoiceUsd = 0m;
                        var useKhr = rep.Role is SalesRole.PreSales or SalesRole.VanSales && _rnd.NextDouble() < 0.25;

                        foreach (var product in chosen)
                        {
                            var cases = rep.Role switch
                            {
                                SalesRole.KeyAccount => _rnd.Next(15, 46),
                                SalesRole.VanSales => _rnd.Next(2, 9),
                                _ => _rnd.Next(1, 6)
                            };
                            cases = Math.Max(1, (int)Math.Round(cases * s));
                            var usd = cases * product.PricePerCaseUsd;
                            invoiceUsd += usd;
                            db.SalesLines.Add(new SalesLine
                            {
                                InvoiceNo = invoiceNo, InvoiceDate = day, EmployeeId = rep.Id, OutletId = outlet.Id, ProductId = product.Id,
                                QuantityCases = cases,
                                Amount = useKhr ? ToKhr(usd, rate) : usd,
                                Currency = useKhr ? Currency.KHR : Currency.USD
                            });

                            if (_rnd.NextDouble() < 0.03)
                            {
                                var back = Math.Min(cases, _rnd.Next(1, 3));
                                var backUsd = back * product.PricePerCaseUsd;
                                db.ReturnLines.Add(new ReturnLine
                                {
                                    ReturnDate = Cap(day.AddDays(_rnd.Next(0, 4)), period.EndDate), EmployeeId = rep.Id, OutletId = outlet.Id,
                                    ProductId = product.Id, QuantityCases = back, Reason = "Damaged / expired",
                                    Amount = useKhr ? ToKhr(backUsd, rate) : backUsd,
                                    Currency = useKhr ? Currency.KHR : Currency.USD
                                });
                            }
                        }

                        if (_rnd.NextDouble() < collectProbability)
                        {
                            var delay = rep.Role == SalesRole.VanSales ? 0 : _rnd.Next(0, 11);
                            db.Collections.Add(new Collection
                            {
                                CollectionDate = Cap(day.AddDays(delay), period.EndDate), EmployeeId = rep.Id, OutletId = outlet.Id,
                                InvoiceNo = invoiceNo,
                                Amount = useKhr ? ToKhr(invoiceUsd, rate) : invoiceUsd,
                                Currency = useKhr ? Currency.KHR : Currency.USD
                            });
                        }
                    }

                    db.Visits.Add(new Visit
                    {
                        VisitDate = day, EmployeeId = rep.Id, OutletId = outlet.Id, Planned = true, Visited = visited,
                        Productive = productive, LinesSold = lineCount
                    });

                    if (visited && _rnd.NextDouble() < 0.12)
                        db.OutletAudits.Add(new OutletAudit
                        {
                            AuditDate = day, EmployeeId = rep.Id, OutletId = outlet.Id, Compliant = _rnd.NextDouble() < Math.Min(0.97, 0.65 * s + 0.1)
                        });
                }
            }

            // flush per rep to keep the change tracker small
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }
    }

    private static DateOnly Cap(DateOnly date, DateOnly max) => date > max ? max : date;

    /// <summary>USD converted to riel, rounded to the nearest 100.</summary>
    private static decimal ToKhr(decimal usd, decimal rate) => Math.Round(usd * rate / 100m, 0) * 100m;

    // ---------- logins ----------

    private async Task CreateUsersAsync(List<Employee> employees, CancellationToken ct)
    {
        foreach (var role in Roles.All)
            if (!await roles.RoleExistsAsync(role))
                await roles.CreateAsync(new IdentityRole(role));

        var password = config["Seed:DevPassword"] ?? "ChangeMe#2026";
        var preSales = await db.Employees.Where(e => e.Role == SalesRole.PreSales).OrderBy(e => e.Code).FirstAsync(ct);
        var supervisor = await db.Employees.Where(e => e.Role == SalesRole.Supervisor).OrderBy(e => e.Code).FirstAsync(ct);
        var manager = await db.Employees.Where(e => e.Role == SalesRole.Manager).OrderBy(e => e.Code).FirstAsync(ct);

        var accounts = new (string Email, string Name, string Role, int? EmployeeId)[]
        {
            ("admin@hanuman.local", "System Admin", Roles.Admin, null),
            ("finance@hanuman.local", "Finance Officer", Roles.Finance, null),
            ("manager@hanuman.local", manager.FullName, Roles.Manager, manager.Id),
            ("supervisor@hanuman.local", supervisor.FullName, Roles.Supervisor, supervisor.Id),
            ("rep@hanuman.local", preSales.FullName, Roles.Rep, preSales.Id)
        };
        foreach (var a in accounts)
        {
            var user = new AppUser { UserName = a.Email, Email = a.Email, DisplayName = a.Name, EmployeeId = a.EmployeeId, EmailConfirmed = true };
            var created = await users.CreateAsync(user, password);
            if (!created.Succeeded)
                throw new InvalidOperationException($"Could not create {a.Email}: {string.Join("; ", created.Errors.Select(e => e.Description))}");
            await users.AddToRoleAsync(user, a.Role);
        }
    }
}
