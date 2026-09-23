using System.Text.Json;

namespace Orvexa.Core;

public sealed record CatalogCache(DateTimeOffset UpdatedAt,IReadOnlyList<PackageItem> Packages);

public sealed class CatalogCacheService
{
    const int MaxPackages=20000;
    const long MaxFileBytes=16L*1024*1024;
    readonly string path;

    public CatalogCacheService(string? basePath=null)
    {
        path=Path.Combine(StoragePaths.Resolve(basePath),"catalog-cache.json");
    }

    public CatalogCache Read()
    {
        try
        {
            if(!AtomicFile.TryReadText(path,MaxFileBytes,out var json))
                return new(DateTimeOffset.MinValue,[]);

            var parsed=JsonSerializer.Deserialize<CatalogCache>(json);
            if(parsed is null) return new(DateTimeOffset.MinValue,[]);
            var updated=parsed.UpdatedAt> DateTimeOffset.UtcNow.AddDays(1)
                ? DateTimeOffset.UtcNow
                : parsed.UpdatedAt;
            return new(updated,Normalize(parsed.Packages??[]));
        }
        catch { return new(DateTimeOffset.MinValue,[]); }
    }

    public void Save(IEnumerable<PackageItem> packages)
    {
        Write(Normalize(packages));
    }

    public void Merge(IEnumerable<PackageItem> packages)
    {
        var current=Read().Packages;
        Write(Normalize(current.Concat(packages)));
    }

    public IReadOnlyList<PackageItem> Search(string query,int skip=0,int take=100)
    {
        query=PackagePolicy.NormalizeQuery(query);
        if(query.Length<2) return [];

        take=Math.Clamp(take,1,500);
        skip=Math.Max(0,skip);

        return Read().Packages
            .Where(x=>x.Name.Contains(query,StringComparison.OrdinalIgnoreCase) ||
                      x.Id.Contains(query,StringComparison.OrdinalIgnoreCase))
            .OrderBy(x=>x.Name.StartsWith(query,StringComparison.OrdinalIgnoreCase)?0:1)
            .ThenBy(x=>x.Name,StringComparer.OrdinalIgnoreCase)
            .Skip(skip)
            .Take(take)
            .ToArray();
    }

    IReadOnlyList<PackageItem> Normalize(IEnumerable<PackageItem> packages)=>
        packages
            .Where(x=>PackagePolicy.IsSafeId(x.Id))
            .GroupBy(x=>x.Id,StringComparer.OrdinalIgnoreCase)
            .Select(group=>group
                .OrderByDescending(x=>!string.IsNullOrWhiteSpace(x.Version))
                .First())
            .OrderBy(x=>x.Name,StringComparer.OrdinalIgnoreCase)
            .Take(MaxPackages)
            .ToArray();

    void Write(IReadOnlyList<PackageItem> packages)
    {
        AtomicFile.WriteText(path,JsonSerializer.Serialize(
            new CatalogCache(DateTimeOffset.UtcNow,packages)));
    }
}