namespace Orvexa.Core;
public sealed class OperationGuard
{
    readonly SemaphoreSlim gate=new(1,1);

    public async Task RunAsync(Func<CancellationToken,Task> action,CancellationToken ct=default)
    {
        await gate.WaitAsync(ct);
        try{await action(ct);}
        finally{gate.Release();}
    }

    public async Task<T> RunAsync<T>(Func<CancellationToken,Task<T>> action,CancellationToken ct=default)
    {
        await gate.WaitAsync(ct);
        try{return await action(ct);}
        finally{gate.Release();}
    }
}