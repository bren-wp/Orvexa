namespace Orvexa.Core;

public sealed record HealthSnapshot(
    bool WingetAvailable,
    string WingetVersion,
    string Os,
    string Architecture,
    long WorkingSetMB,
    long FreeDiskMB,
    DateTimeOffset At);

public sealed class HealthService
{
    public async Task<HealthSnapshot> GetAsync(CancellationToken ct=default)
    {
        var wingetAvailable=false;
        var wingetVersion="Unavailable";

        try
        {
            var result=await ProcessRunner.RunAsync(
                "winget.exe",
                ["--version"],
                TimeSpan.FromSeconds(5),
                ct);

            wingetAvailable=result.Code==0;
            if(wingetAvailable && !string.IsNullOrWhiteSpace(result.Output))
                wingetVersion=result.Output.Trim().Split(['\r','\n'],StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()
                              ?? "Available";
        }
        catch(OperationCanceledException) { throw; }
        catch { }

        long free=0;
        try
        {
            var root=Path.GetPathRoot(Environment.SystemDirectory);
            if(root is not null)
                free=new DriveInfo(root).AvailableFreeSpace/1024/1024;
        }
        catch { }

        return new(
            wingetAvailable,
            wingetVersion,
            System.Runtime.InteropServices.RuntimeInformation.OSDescription,
            System.Runtime.InteropServices.RuntimeInformation.OSArchitecture.ToString(),
            Environment.WorkingSet/1024/1024,
            free,
            DateTimeOffset.Now);
    }
}