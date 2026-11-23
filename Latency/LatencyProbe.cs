using System.Diagnostics;
using System.Net;
using System.Net.Sockets;

namespace Latency;

public sealed record LatencySample(bool Success, int LatencyMilliseconds, string? Error = null);

public sealed class LatencyProbe
{
    public async Task<LatencySample> ProbeAsync(
        string host,
        int port,
        CancellationToken cancellationToken)
    {
        try
        {
            using var dnsTimeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            dnsTimeoutSource.CancelAfter(TimeSpan.FromMilliseconds(1500));
            var addresses = await Dns.GetHostAddressesAsync(host, dnsTimeoutSource.Token);
            var ipv4Addresses = addresses
                .Where(address => address.AddressFamily == AddressFamily.InterNetwork)
                .ToArray();

            var candidates = ipv4Addresses.Length > 0
                ? ipv4Addresses
                : addresses.Where(address => address.AddressFamily == AddressFamily.InterNetworkV6).ToArray();

            if (candidates.Length == 0)
                return new LatencySample(false, 0, "No se resolvió el host");

            foreach (var address in candidates)
            {
                using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeoutSource.CancelAfter(TimeSpan.FromMilliseconds(1500));

                using var client = new TcpClient();
                var stopwatch = Stopwatch.StartNew();

                try
                {
                    await client.ConnectAsync(address, port, timeoutSource.Token);
                    stopwatch.Stop();
                    return new LatencySample(true, Math.Max(1, (int)Math.Round(stopwatch.Elapsed.TotalMilliseconds)));
                }
                catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
                {
                    return new LatencySample(false, 0, "Tiempo de espera agotado");
                }
                catch (SocketException ex)
                {
                    // Try the remaining resolved addresses.
                    if (address == candidates[^1])
                        return new LatencySample(false, 0, ex.SocketErrorCode.ToString());
                }
            }

            return new LatencySample(false, 0, "No se pudo conectar");
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return new LatencySample(false, 0, "Cancelado");
        }
        catch (Exception ex)
        {
            return new LatencySample(false, 0, ex.Message);
        }
    }
}
