using System.Diagnostics;
using System.Text;

namespace Orvexa.Core;

public static class ProcessRunner
{
    const int MaxCapturedCharacters = 4 * 1024 * 1024;

    public static async Task<(int Code,string Output,string Error)> RunAsync(
        string file,
        IEnumerable<string> args,
        TimeSpan timeout,
        CancellationToken ct=default)
    {
        if (string.IsNullOrWhiteSpace(file)) throw new ArgumentException("Executable is required.", nameof(file));
        if (timeout <= TimeSpan.Zero) throw new ArgumentOutOfRangeException(nameof(timeout));

        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = file,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            }
        };

        foreach (var arg in args) process.StartInfo.ArgumentList.Add(arg);
        if (!process.Start()) throw new InvalidOperationException($"Could not start {Path.GetFileName(file)}.");

        var outputTask = ReadLimitedAsync(process.StandardOutput, MaxCapturedCharacters);
        var errorTask = ReadLimitedAsync(process.StandardError, MaxCapturedCharacters);
        using var timeoutCts = new CancellationTokenSource(timeout);
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);

        try
        {
            await process.WaitForExitAsync(linked.Token);
        }
        catch (OperationCanceledException)
        {
            TryKill(process);
            try { await process.WaitForExitAsync(CancellationToken.None); } catch { }
            if (ct.IsCancellationRequested) throw;
            throw new TimeoutException($"{Path.GetFileName(file)} exceeded the allowed execution time.");
        }

        return (process.ExitCode, await outputTask, await errorTask);
    }

    static async Task<string> ReadLimitedAsync(StreamReader reader,int maxCharacters)
    {
        var result = new StringBuilder(Math.Min(maxCharacters, 64 * 1024));
        var buffer = new char[8192];
        while (true)
        {
            var read = await reader.ReadAsync(buffer.AsMemory());
            if (read == 0) break;
            if (result.Length >= maxCharacters) continue;
            var remaining = maxCharacters - result.Length;
            result.Append(buffer,0,Math.Min(read,remaining));
        }
        if (result.Length >= maxCharacters) result.Append("\n[output truncated]");
        return result.ToString();
    }

    static void TryKill(Process process)
    {
        try
        {
            if (!process.HasExited) process.Kill(true);
        }
        catch { }
    }
}
