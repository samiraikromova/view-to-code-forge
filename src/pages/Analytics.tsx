import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft, TrendingUp, Zap, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const monthlyCreditsData = [
  { month: "Jun", credits: 12500 },
  { month: "Jul", credits: 18750 },
  { month: "Aug", credits: 15200 },
  { month: "Sep", credits: 21300 },
  { month: "Oct", credits: 19800 },
  { month: "Nov", credits: 24150 },
];

const toolsUsageData = [
  { tool: "CB4", usage: 3420, cost: 68.40 },
  { tool: "Copywriting Assistant", usage: 2180, cost: 43.60 },
  { tool: "Sales Call Review", usage: 1890, cost: 37.80 },
  { tool: "Ad Writing", usage: 1520, cost: 30.40 },
  { tool: "Contract Writer", usage: 980, cost: 19.60 },
  { tool: "Image Ad Generator", usage: 750, cost: 15.00 },
];

const projectCostData = [
  { project: "Marketing Campaign Q4", cost: 145.20, percentage: 28 },
  { project: "Sales Enablement", cost: 112.80, percentage: 22 },
  { project: "Content Creation", cost: 98.40, percentage: 19 },
  { project: "Client Proposals", cost: 87.60, percentage: 17 },
  { project: "Internal Operations", cost: 72.00, percentage: 14 },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function Analytics() {
  const navigate = useNavigate();
  const currentMonthCredits = 24150;
  const totalSpent = 516.00;
  const avgDailyCredits = 805;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Usage Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your AI tool usage and spending</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Month Credits</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonthCredits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Across all projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Daily Usage</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgDailyCredits}</div>
              <p className="text-xs text-muted-foreground">credits per day</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Credits Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Monthly Credit Consumption</CardTitle>
            <CardDescription>Your credit usage over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                credits: {
                  label: "Credits",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyCreditsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="credits" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Used AI Tools */}
          <Card>
            <CardHeader>
              <CardTitle>Most-Used AI Tools</CardTitle>
              <CardDescription>Credits consumed per tool this month</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  usage: {
                    label: "Usage",
                    color: "hsl(var(--accent))",
                  },
                }}
                className="h-[350px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={toolsUsageData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="tool" type="category" stroke="hsl(var(--muted-foreground))" width={150} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="usage" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Cost Breakdown by Project */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown by Project</CardTitle>
              <CardDescription>Spending distribution across your projects</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  cost: {
                    label: "Cost",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[350px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectCostData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${percentage}%`}
                      outerRadius={100}
                      fill="hsl(var(--primary))"
                      dataKey="cost"
                    >
                      {projectCostData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="mt-4 space-y-2">
                {projectCostData.map((project, index) => (
                  <div key={project.project} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-foreground">{project.project}</span>
                    </div>
                    <span className="text-muted-foreground">${project.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
