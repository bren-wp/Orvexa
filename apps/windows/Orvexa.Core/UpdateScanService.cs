namespace Orvexa.Core;
public sealed record AvailableUpdate(string Name,string Id,string InstalledVersion,string AvailableVersion);

public sealed class UpdateScanService
{
    public async Task<IReadOnlyList<AvailableUpdate>> ScanAsync(CancellationToken ct=default)
    {
        var r=await ProcessRunner.RunAsync("winget.exe",
            ["upgrade","--accept-source-agreements","--disable-interactivity"],
            TimeSpan.FromSeconds(45),ct);

        return WingetTableParser.ParseRows(r.Output)
            .Where(x=>x.Length>=4 && PackagePolicy.IsSafeId(x[1]) &&
                      !string.IsNullOrWhiteSpace(x[2]) && !string.IsNullOrWhiteSpace(x[3]))
            .Select(x=>new AvailableUpdate(x[0],x[1],x[2],x[3]))
            .ToArray();
    }
}