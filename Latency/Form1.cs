namespace Latency;

public partial class Form1 : Form
{
    private readonly LatencyProbe _probe = new();
    private readonly List<LatencySample> _samples = new();
    private CancellationTokenSource? _monitorCancellation;
    private bool _thresholdAlertActive;
    private readonly string _historyPath;
    private string? _bridgePath;
    private int _bridgeHome;
    private int _bridgeWorld;
    private System.Windows.Forms.Timer? _bridgeRefreshTimer;

    public Form1()
    {
        InitializeComponent();
        _historyPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "WowLatencyMonitor",
            "historial.csv");
        Directory.CreateDirectory(Path.GetDirectoryName(_historyPath)!);
        TargetComboBox.Items.Add(new TargetOption("Americas (US)", "worldofwarcraft.blizzard.com", 443));
        TargetComboBox.SelectedIndex = 0;
        TargetComboBox.Enabled = false;
        ThresholdUpDown.Value = 500;
        ProbeDetailLabel.Text = "Verificando conexión...";
        DiscoverBridge();
        LoadHistory();
        DiscoverBridge();
        UpdateBridgeStatus();
        _bridgeRefreshTimer = new System.Windows.Forms.Timer
        {
            Interval = 1000,
            Enabled = true
        };
        _bridgeRefreshTimer.Tick += (_, _) => UpdateBridgeStatus();
    }

    private async void StartButton_Click(object sender, EventArgs e)
    {
        if (_monitorCancellation is not null)
        {
            StopMonitoring();
            return;
        }

        if (!TryGetTarget(out var host, out var port))
        {
            MessageBox.Show(this, "Indica un host y puerto válidos.", "Destino no válido",
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        if (!TryReadLiveWoWLatencies(out var homeLatency, out var worldLatency))
        {
            MessageBox.Show(this,
                "No encontré datos recientes del addon de WoW.\n\n" +
                "Instala LatencyBridge en _retail_/Interface/AddOns, abre WoW y entra con el personaje conectado.",
                "Datos reales no disponibles",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
            return;
        }

        SetLiveWoWLatencies(homeLatency, worldLatency);

        _monitorCancellation = new CancellationTokenSource();
        _samples.Clear();
        _thresholdAlertActive = false;
        SaveHistorySnapshot();
        StartButton.Text = "Detener";
        StatusLabel.Text = "Conectando...";
        StatusLabel.ForeColor = Color.FromArgb(220, 150, 40);
        TargetComboBox.Enabled = false;

        var threshold = (int)ThresholdUpDown.Value;
        await RunSingleProbeAsync(host, port, threshold, _monitorCancellation.Token);
    }

    private async Task RunSingleProbeAsync(
        string host,
        int port,
        int threshold,
        CancellationToken cancellationToken)
    {
        try
        {
            var sample = await _probe.ProbeAsync(host, port, cancellationToken);
            if (!cancellationToken.IsCancellationRequested)
                RecordSample(sample, threshold);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        finally
        {
            if (!cancellationToken.IsCancellationRequested)
                BeginInvoke(StopMonitoring);
        }
    }

    private void RecordSample(LatencySample sample, int threshold)
    {
        if (InvokeRequired)
        {
            BeginInvoke(() => RecordSample(sample, threshold));
            return;
        }

        _samples.Add(sample);
        if (_samples.Count > 120)
            _samples.RemoveAt(0);

        var successful = _samples.Where(s => s.Success).ToList();
        var failed = _samples.Count - successful.Count;
        var loss = _samples.Count == 0 ? 0 : failed * 100.0 / _samples.Count;

        if (sample.Success)
        {
            var current = sample.LatencyMilliseconds;
            var minimum = successful.Min(s => s.LatencyMilliseconds);
            var maximum = successful.Max(s => s.LatencyMilliseconds);
            var average = successful.Average(s => s.LatencyMilliseconds);

            UpdateWoWLatencies();
            SetMetricText(MinimumLabel, $"{minimum} ms");
            SetMetricText(MaximumLabel, $"{maximum} ms");
            SetMetricText(AverageLabel, $"{average:F0} ms");
            SetMetricText(LossLabel, $"{loss:F0}%");
            StatusLabel.Text = current >= threshold
                ? "Latencia alta"
                : current >= threshold * 0.6
                    ? "Latencia moderada"
                    : "Conexión buena";
            StatusLabel.ForeColor = current >= threshold
                ? Color.FromArgb(220, 70, 70)
                : current >= threshold * 0.6
                    ? Color.FromArgb(220, 150, 40)
                    : Color.FromArgb(50, 170, 110);
            ProbeDetailLabel.Text = "Battle.net Americas · TCP 443";

            if (current >= threshold)
                RaiseThresholdAlert(current, threshold);
            else
                _thresholdAlertActive = false;
        }
        else
        {
            UpdateWoWLatencies();
            SetMetricText(LossLabel, $"{loss:F0}%");
            StatusLabel.Text = "No se pudo conectar";
            StatusLabel.ForeColor = Color.FromArgb(220, 70, 70);
            ProbeDetailLabel.Text = !string.IsNullOrWhiteSpace(sample.Error)
                ? $"Detalle: {sample.Error}"
                : "Detalle: el servidor no respondió";
            RaiseThresholdAlert(null, threshold);
        }

        LastProbeLabel.Text = $"Última prueba: {DateTime.Now:HH:mm:ss}";
    }

    private static void SetMetricText(Label label, string text)
    {
        label.Text = text;
        label.Font = text.Length > 9
            ? new Font("Segoe UI", 12F, FontStyle.Bold)
            : new Font("Segoe UI", 16F, FontStyle.Bold);
    }

    private void RaiseThresholdAlert(int? latency, int threshold)
    {
        if (_thresholdAlertActive)
            return;

        _thresholdAlertActive = true;
        var message = latency.HasValue
            ? $"El gateway respondió en {latency.Value} ms."
            : "El gateway no respondió.";

        NotifyIcon.ShowBalloonTip(
            4000,
            "Alerta de latencia",
            $"{message} Umbral: {threshold} ms",
            ToolTipIcon.Warning);
    }

    private void StopMonitoring()
    {
        _monitorCancellation?.Cancel();
        _monitorCancellation = null;
        StartButton.Text = "Iniciar";
        StatusLabel.Text = "Detenido";
        StatusLabel.ForeColor = Color.FromArgb(140, 150, 165);
        TargetComboBox.Enabled = false;
        ProbeDetailLabel.Text = "Medición detenida";
        _thresholdAlertActive = false;
    }

    private bool TryGetTarget(out string host, out int port)
    {
        host = "";
        port = 443;

        if (TargetComboBox.SelectedItem is TargetOption option)
        {
            host = option.Host;
            port = option.Port;
            return true;
        }

        return false;
    }

    private void UpdateWoWLatencies()
    {
        if (InvokeRequired)
        {
            BeginInvoke(UpdateWoWLatencies);
            return;
        }

        var home = _bridgeHome > 0 ? $"{_bridgeHome} ms" : "--";
        var world = _bridgeWorld > 0 ? $"{_bridgeWorld} ms" : "--";

        CurrentLabel.Text = $"H: {home}\r\nM: {world}";
        CurrentLabel.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
    }

    private void DiscoverBridge()
    {
        var roots = DriveInfo.GetDrives()
            .Where(drive => drive.IsReady)
            .Select(drive => drive.RootDirectory.FullName)
            .ToArray();

        foreach (var root in roots)
        {
            try
            {
                foreach (var savedVariables in Directory.EnumerateFiles(
                             root,
                             "LatencyBridge.lua",
                             SearchOption.AllDirectories)
                             .Take(200))
                {
                    var fullPath = savedVariables.Replace('\\', '/');
                    if (fullPath.Contains("/WTF/Account/", StringComparison.OrdinalIgnoreCase) ||
                        fullPath.Contains("/WTF/Account_", StringComparison.OrdinalIgnoreCase))
                    {
                        _bridgePath = savedVariables;
                        return;
                    }
                }
            }
            catch (UnauthorizedAccessException)
            {
            }
            catch (IOException)
            {
            }
        }
    }

    private void UpdateBridgeStatus()
    {
        if (string.IsNullOrEmpty(_bridgePath) || !File.Exists(_bridgePath))
            DiscoverBridge();

        if (TryReadLiveWoWLatencies(out var home, out var world))
        {
            SetLiveWoWLatencies(home, world);
            ProbeDetailLabel.Text = "Datos reales de WoW · addon activo";
        }
        else
        {
            _bridgeHome = 0;
            _bridgeWorld = 0;
            UpdateWoWLatencies();
            ProbeDetailLabel.Text = "Addon de WoW no disponible";
        }
    }

    private bool TryReadLiveWoWLatencies(out int home, out int world)
    {
        home = 0;
        world = 0;

        if (string.IsNullOrEmpty(_bridgePath) || !File.Exists(_bridgePath))
            return false;

        try
        {
            var modified = File.GetLastWriteTime(_bridgePath);
            if (DateTime.Now - modified > TimeSpan.FromMinutes(2))
                return false;

            var text = File.ReadAllText(_bridgePath);
            home = ParseLuaNumber(text, "home") ?? 0;
            world = ParseLuaNumber(text, "world") ?? 0;
            return home > 0 && world > 0;
        }
        catch
        {
            return false;
        }
    }

    private void SetLiveWoWLatencies(int home, int world)
    {
        _bridgeHome = home;
        _bridgeWorld = world;
        UpdateWoWLatencies();
    }

    private static int? ParseLuaNumber(string text, string key)
    {
        var match = System.Text.RegularExpressions.Regex.Match(
            text,
            $@"(?:^|\s)\[?[""']?{RegexEscape(key)}[""']?\]?\s*=\s*(\d+)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        return match.Success && int.TryParse(match.Groups[1].Value, out var value)
            ? value
            : null;
    }

    private static string RegexEscape(string value) =>
        System.Text.RegularExpressions.Regex.Escape(value);

    private void SaveHistorySnapshot()
    {
        var time = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        var home = _bridgeHome > 0 ? _bridgeHome.ToString() : "";
        var world = _bridgeWorld > 0 ? _bridgeWorld.ToString() : "";

        HistoryGrid.Rows.Insert(0, time, home, world);
        if (HistoryGrid.Rows.Count > 500)
            HistoryGrid.Rows.RemoveAt(HistoryGrid.Rows.Count - 1);

        var line = string.Join(",", new[]
        {
            EscapeCsv(time),
            EscapeCsv(home),
            EscapeCsv(world)
        });

        var writeHeader = !File.Exists(_historyPath) || new FileInfo(_historyPath).Length == 0;
        using var writer = new StreamWriter(_historyPath, append: true);
        if (writeHeader)
            writer.WriteLine("Hora,Hogar(ms),Mundo(ms)");
        writer.WriteLine(line);
    }

    private void LoadHistory()
    {
        if (!File.Exists(_historyPath))
            return;

        var loadedRows = new List<(string Time, string Home, string World)>();
        using var reader = new StreamReader(_historyPath);
        reader.ReadLine();
        while (!reader.EndOfStream)
        {
            var fields = ParseCsv(reader.ReadLine() ?? "");
            if (fields.Count >= 3)
                loadedRows.Add((fields[0], fields[1], fields[2]));
        }

        foreach (var row in loadedRows.Where(row =>
                     int.TryParse(row.Home, out _) &&
                     int.TryParse(row.World, out _)))
        {
            HistoryGrid.Rows.Insert(0, row.Time, row.Home, row.World);
        }

        var latest = loadedRows
            .Where(row => int.TryParse(row.Home, out var home) &&
                          int.TryParse(row.World, out var world) &&
                          home > 0 && world > 0)
            .LastOrDefault();
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\r') || value.Contains('\n'))
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        return value;
    }

    private static List<string> ParseCsv(string line)
    {
        var fields = new List<string>();
        var value = new System.Text.StringBuilder();
        var quoted = false;

        for (var i = 0; i < line.Length; i++)
        {
            var character = line[i];
            if (character == '"')
            {
                if (quoted && i + 1 < line.Length && line[i + 1] == '"')
                {
                    value.Append('"');
                    i++;
                }
                else
                {
                    quoted = !quoted;
                }
            }
            else if (character == ',' && !quoted)
            {
                fields.Add(value.ToString());
                value.Clear();
            }
            else
            {
                value.Append(character);
            }
        }

        fields.Add(value.ToString());
        return fields;
    }

    private void Form1_FormClosing(object sender, FormClosingEventArgs e)
    {
        _monitorCancellation?.Cancel();
        _bridgeRefreshTimer?.Stop();
        _bridgeRefreshTimer?.Dispose();
        NotifyIcon.Visible = false;
        NotifyIcon.Dispose();
    }

    private void Form1_Resize(object sender, EventArgs e)
    {
        if (WindowState == FormWindowState.Minimized)
        {
            NotifyIcon.Visible = true;
            Hide();
        }
    }

    private void NotifyIcon_DoubleClick(object sender, EventArgs e)
    {
        Show();
        WindowState = FormWindowState.Normal;
        Activate();
    }

    private sealed record TargetOption(string Name, string Host, int Port)
    {
        public override string ToString() => Name;
    }
}
