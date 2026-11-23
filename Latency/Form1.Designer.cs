namespace Latency;

partial class Form1
{
    private System.ComponentModel.IContainer components = null!;
    private ComboBox TargetComboBox = null!;
    private NumericUpDown ThresholdUpDown = null!;
    private Button StartButton = null!;
    private Label StatusLabel = null!;
    private Label CurrentLabel = null!;
    private Label MinimumLabel = null!;
    private Label MaximumLabel = null!;
    private Label AverageLabel = null!;
    private Label LossLabel = null!;
    private Label LastProbeLabel = null!;
    private Label ProbeDetailLabel = null!;
    private DataGridView HistoryGrid = null!;
    private NotifyIcon NotifyIcon = null!;

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            components?.Dispose();
        }
        base.Dispose(disposing);
    }

    private void InitializeComponent()
    {
        components = new System.ComponentModel.Container();
        Text = "Wow Latency Monitor";
        Name = "WowLatencyMonitor";
        AutoScaleMode = AutoScaleMode.Dpi;
        ClientSize = new Size(760, 500);
        MinimumSize = new Size(680, 460);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(18, 24, 33);
        ForeColor = Color.FromArgb(220, 230, 240);
        Font = new Font("Segoe UI", 9F);
        FormBorderStyle = FormBorderStyle.Sizable;
        MaximizeBox = true;
        FormClosing += Form1_FormClosing;
        Resize += Form1_Resize;

        NotifyIcon = new NotifyIcon(components)
        {
            Icon = SystemIcons.Application,
            Text = "Wow Latency Monitor",
            Visible = false
        };
        NotifyIcon.DoubleClick += NotifyIcon_DoubleClick;

        var targetLabel = CreateLabel("Gateway", 24, 20, 220);
        TargetComboBox = CreateComboBox(24, 42, 220);

        var thresholdLabel = CreateLabel("Alerta desde (ms)", 24, 82, 180);
        ThresholdUpDown = CreateNumericUpDown(24, 104, 110, 100, 5000, 500);
        ThresholdUpDown.Increment = 50;

        StartButton = new Button
        {
            Left = 150,
            Top = 102,
            Width = 110,
            Height = 29,
            Text = "Iniciar",
            BackColor = Color.FromArgb(45, 120, 180),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            UseVisualStyleBackColor = false,
            Font = new Font("Segoe UI", 9F, FontStyle.Bold)
        };
        StartButton.FlatAppearance.BorderSize = 0;
        StartButton.Click += StartButton_Click;

        StatusLabel = new Label
        {
            Left = 510,
            Top = 82,
            Width = 210,
            Height = 30,
            Text = "Detenido",
            ForeColor = Color.FromArgb(140, 150, 165),
            Font = new Font("Segoe UI", 12F, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleLeft
        };

        LastProbeLabel = new Label
        {
            Left = 510,
            Top = 108,
            Width = 220,
            Height = 24,
            Text = "Última prueba: --",
            ForeColor = Color.FromArgb(150, 160, 175),
            TextAlign = ContentAlignment.MiddleRight
        };

        ProbeDetailLabel = new Label
        {
            Left = 510,
            Top = 132,
            Width = 220,
            Height = 18,
            Text = "Verificando conexión...",
            ForeColor = Color.FromArgb(150, 160, 175),
            TextAlign = ContentAlignment.MiddleRight
        };

        var cardsTop = 170;
        CurrentLabel = CreateMetricCard(cardsTop, 24);
        MinimumLabel = CreateMetricCard(cardsTop, 165);
        MaximumLabel = CreateMetricCard(cardsTop, 306);
        AverageLabel = CreateMetricCard(cardsTop, 447);
        LossLabel = CreateMetricCard(cardsTop, 588);

        HistoryGrid = new DataGridView
        {
            Left = 24,
            Top = 280,
            Width = 712,
            Height = 168,
            BackColor = Color.FromArgb(25, 32, 43),
            BorderStyle = BorderStyle.FixedSingle,
            Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right,
            ReadOnly = true,
            AllowUserToAddRows = false,
            AllowUserToDeleteRows = false,
            RowHeadersVisible = false,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            BackgroundColor = Color.FromArgb(25, 32, 43),
            ForeColor = Color.White,
            GridColor = Color.FromArgb(55, 70, 90),
            EnableHeadersVisualStyles = false
        };
        HistoryGrid.ColumnHeadersDefaultCellStyle = new DataGridViewCellStyle
        {
            BackColor = Color.FromArgb(35, 45, 58),
            ForeColor = Color.FromArgb(220, 230, 240),
            Font = new Font("Segoe UI", 9F, FontStyle.Bold)
        };
        HistoryGrid.DefaultCellStyle = new DataGridViewCellStyle
        {
            BackColor = Color.FromArgb(25, 32, 43),
            ForeColor = Color.FromArgb(235, 240, 245),
            Font = new Font("Segoe UI", 9F),
            SelectionBackColor = Color.FromArgb(45, 120, 180),
            SelectionForeColor = Color.White
        };
        HistoryGrid.Columns.Add("Hora", "Hora");
        HistoryGrid.Columns.Add("Hogar", "Hogar (ms)");
        HistoryGrid.Columns.Add("Mundo", "Mundo (ms)");

        var disclaimer = new Label
        {
            Left = 24,
            Top = 452,
            Width = 712,
            Height = 32,
            Text = "Hogar y Mundo deben venir de WoW mediante el addon. La prueba TCP es independiente y no sustituye esos valores.",
            ForeColor = Color.FromArgb(150, 160, 175),
            TextAlign = ContentAlignment.MiddleLeft,
            Anchor = AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Bottom
        };

        Controls.AddRange(new Control[]
        {
            targetLabel, TargetComboBox,
            thresholdLabel, ThresholdUpDown, StartButton, StatusLabel, LastProbeLabel,
            ProbeDetailLabel,
            CreateMetricTitle("LATENCIA ACTUAL", cardsTop - 30, 24),
            CreateMetricTitle("MÍNIMA", cardsTop - 30, 165),
            CreateMetricTitle("MÁXIMA", cardsTop - 30, 306),
            CreateMetricTitle("PROMEDIO", cardsTop - 30, 447),
            CreateMetricTitle("PÉRDIDA", cardsTop - 30, 588),
            CurrentLabel, MinimumLabel, MaximumLabel, AverageLabel, LossLabel,
            HistoryGrid, disclaimer
        });
    }

    private static Label CreateLabel(string text, int left, int top, int width)
    {
        return new Label
        {
            Text = text,
            Left = left,
            Top = top,
            Width = width,
            Height = 20,
            ForeColor = Color.FromArgb(150, 160, 175),
            TextAlign = ContentAlignment.MiddleLeft
        };
    }

    private static ComboBox CreateComboBox(int left, int top, int width)
    {
        return new ComboBox
        {
            Left = left,
            Top = top,
            Width = width,
            Height = 27,
            DropDownStyle = ComboBoxStyle.DropDownList,
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(28, 36, 48),
            ForeColor = Color.White
        };
    }

    private static TextBox CreateTextBox(int left, int top, int width)
    {
        return new TextBox
        {
            Left = left,
            Top = top,
            Width = width,
            Height = 27,
            BackColor = Color.FromArgb(28, 36, 48),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
    }

    private static NumericUpDown CreateNumericUpDown(
        int left,
        int top,
        int width,
        decimal minimum,
        decimal maximum,
        decimal value)
    {
        return new NumericUpDown
        {
            Left = left,
            Top = top,
            Width = width,
            Height = 27,
            Minimum = minimum,
            Maximum = maximum,
            Value = value,
            BackColor = Color.FromArgb(28, 36, 48),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
    }

    private static Label CreateMetricTitle(string text, int top, int left)
    {
        return new Label
        {
            Text = text,
            Left = left,
            Top = top,
            Width = 130,
            Height = 20,
            ForeColor = Color.FromArgb(150, 160, 175),
            Font = new Font("Segoe UI", 8F, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleLeft
        };
    }

    private static Label CreateMetricCard(int top, int left)
    {
        return new Label
        {
            Left = left,
            Top = top,
            Width = 130,
            Height = 55,
            Text = "--",
            BackColor = Color.FromArgb(25, 32, 43),
            ForeColor = Color.FromArgb(235, 240, 245),
            Font = new Font("Segoe UI", 16F, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleCenter
        };
    }
}
