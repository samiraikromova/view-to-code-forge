import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import { LearnSidebar, Module } from "@/components/learn/LearnSidebar";
import { LearnInterface } from "@/components/learn/LearnInterface";

interface Chat {
  id: string;
  title: string;
  starred: boolean;
}

const Index = () => {
  const [mode, setMode] = useState<"chat" | "learn">("chat");
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      title: "Marketing campaign ideas",
      starred: false,
    },
    {
      id: "2",
      title: "Video script review",
      starred: false,
    },
    {
      id: "3",
      title: "Product description help",
      starred: false,
    },
  ]);

  // Sidebar collapse states
  const [chatSidebarCollapsed, setChatSidebarCollapsed] = useState(false);
  const [learnSidebarCollapsed, setLearnSidebarCollapsed] = useState(false);

  // Learn mode state
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"recordings" | "materials">("materials");
  
  // Call Recordings Data
  const [recordingsData, setRecordingsData] = useState<Module[]>([
    {
      id: "module-1",
      title: "November 2025",
      lessons: [
        { 
          id: "rec-1", 
          moduleId: "module-1", 
          title: "LC Group Call 11/28", 
          duration: "~45 min", 
          completed: false, 
          description: `• **CRM Adoption Decision:** Go High Level CRM will cut annual costs from $55,000 to about $3,600, enabling savings and better resource allocation.

• **Sales Pipeline Focus:** Emphasized multi-stage sales pipelines, direct follow-up, and in-person outreach as critical for client acquisition and revenue growth.

• **Ad Spend Strategies:** Discussed balancing advertising budget with outreach efforts; optimized targeting and localized approaches to maximize ROI.

• **Revenue Growth Goals:** Team members set clear revenue targets, emphasizing accountability; several aim for substantial increases by mid and late 2026.

• **Operational Improvements:** Implementing structured training and buddy systems to enhance performance and ensure consistent outreach efforts across the team.

• **Market Positioning Insight:** Highlighted the value of authentic human connections over automation, encouraging creative, niche-specific offerings to stand out in a crowded market.

## Notes

### CRM Platform Adoption and Setup

The team decided to adopt Go High Level CRM as a cost-effective alternative to HubSpot, aiming to reduce annual CRM expenses from $55,000 to approximately $3,600 per year (08:17).

- Cam shared that his main client is switching from HubSpot to High Level due to HubSpot's steep $55,000 yearly cost versus High Level's $300 monthly cost.
- He offered to provide white-label High Level accounts to team members at no additional CRM license cost, only charging for SMS usage at $0.01 per message.
- The team discussed necessary compliance steps for SMS marketing, including mandatory A2P approval for any SMS campaigns, with Cam providing a compliant website template to streamline this approval process (09:23).
- The group collaboratively designed a custom sales pipeline in High Level with stages like new lead, contacted, follow-up, call booked, no show, proposal sent, and closed, to manage client outreach and maximize lead tracking efficiency (31:44).
- Integration capabilities with Instagram DMs and automation workflows were highlighted to centralize messaging and automate lead nurturing, including AI-driven conversation agents (37:06, 42:59).
- Cam acknowledged limitations of High Level's funnel and page builder tools, describing them as "clunky" but acceptable for cost savings (45:19).
- Billing and team access management were outlined, with SMS and automation costs being the main variable expenses (47:19).
- Cam committed to supporting the team with setup, including adding subaccounts and admin access, ensuring everyone can begin using High Level quickly (52:32).

### Sales Pipeline and Outreach Strategy

The team emphasized the importance of multi-stage sales pipelines combined with relentless lead follow-up and in-person outreach to drive client acquisition and revenue growth (32:17, 34:33).

- Paul Snowman recommended pipeline stages that capture nuances like "hot follow-up," "long-term nurture," and "call pending" to better reflect real sales conversations.
- Cam and Paul stressed that managing over 10 daily leads necessitates pipelines to prevent leads from slipping through the cracks.
- The group agreed that in-person meetings outperform phone or digital communication for closing high-value retainers, citing Cam's largest retainer sale of $25,000/month as an in-person close after a two-month nurturing process (36:01, 39:36, 41:24).
- Cam repeatedly urged team members, especially Ahmed Rasta, to take aggressive local outreach actions, including knocking on doors if ad spend is unavailable, to generate leads and accelerate sales (29:25).
- The team discussed the sales funnel as a numbers game, where consistent outreach, follow-ups, and persistence—sometimes over months—are crucial for converting prospects (31:09).
- Kayla shared her story of boosting her closing rate from zero to consistent $10K+ months by switching from cold calling to in-person visits, reinforcing the value of direct interaction (36:01).
- Thomas Visgintas highlighted his success with cold email outreach, sending 20 new cold videos and 140 replies daily, resulting in a 5% response rate, demonstrating email as an effective channel when paired with persistence (03:22).
- The team acknowledged that many prospects initially say "we'll keep this in mind," which Cam identified as a soft no that requires follow-up either by phone or in person (34:39).

### Advertising and Client Acquisition

Advertising spend and client acquisition strategies were discussed with a focus on optimizing ad targeting and balancing spend with outreach effort to maximize ROI (20:15, 56:08).

- Ahmed Rasta is currently out of ad spend and plans to supplement with door-to-door outreach using a curated list of 250 prospects segmented by territory, targeting localized niches for better ad relevance (23:58).
- Cam advised Rasta to create multiple specific ads targeting different niches (e.g., plumber, electrician, lawyer) to improve engagement and reduce overwhelm by focusing on fewer, high-impact creatives (21:24).
- Running ads was framed as a privilege earned through client acquisition and pipeline development, with caution advised due to ad budget risks and the need for strategic deployment (27:28).
- Paul Snowman shared running 157 creatives during a recent sprint to diversify touchpoints and increase lead volume (23:03).
- Danny reported a client spending $80K per month on ads and generating $330K in sales last month, highlighting the scale possible with optimized ad campaigns (56:07).
- Cam described using free or performance-based offers (e.g., free video shoots tied to KPIs) as a strategy to overcome client objections and build trust before charging full retainers (25:22).
- Ryan Zeik and Cam planned to finalize ad account setups and admin access to get campaigns live by Cyber Monday to capitalize on seasonal demand (50:03, 58:50).

### Individual Performance and Growth Targets

Several team members shared current revenue figures, challenges, and growth goals to establish accountability and clarity for upcoming quarters (06:50, 13:14, 59:49).

- James Cavazos recently moved back in with his parents, starting fresh after a split from a previous company, targeting $30K in monthly revenue by June and $100K by November, leveraging agency coaching and peer accountability for accelerated growth (07:13, 10:41).
- Evan Thompson is focusing on UGC coaching with two paying clients at a $5K price point, prioritizing slow, quality fulfillment over scaling to ensure client success before expanding (13:27).
- Max Patenaude reported generating $27K cash collected this month from YouTube content and local ads, though noting a low close rate that he is actively working to improve (59:49).
- Ahmed Rasta is constrained by lack of ad budget but is preparing to execute local outreach and refine his client pipeline to restart lead flow (20:15, 23:58).
- Cam emphasized the importance of consistent outreach and follow-up, noting that many leads require extended nurturing over weeks or months before closing, encouraging team members to persist beyond initial rejections (30:58).

### Process Improvements and Accountability Systems

The team is implementing systems to improve operational discipline, accountability, and training content delivery to accelerate learning and performance (09:45, 40:00).

- Cam plans to develop a structured curriculum with topic requests and reminders to balance training content delivery and open Q&A sessions, enhancing engagement and learning outcomes (09:45).
- The group benefits from a buddy system, where members frequently jump on calls to support outreach efforts, share progress, and maintain motivation, which Cam highlighted as critical to sticking with tough sales processes (06:46).
- An unusual but effective accountability mechanism was mentioned where Paul uses a "drink your own urine" punishment to motivate outreach efforts—showing creative approaches to staying disciplined (01:07).
- Cam regularly tracks CRM usage, outreach volume, and pipeline movement to help the team make data-driven decisions and pivot strategies as needed (39:31).
- The team is encouraged to maintain a mix of automated and manual outreach, combining AI tools with human interactions to maximize conversion without sacrificing authenticity (41:36).

### Long-Term Vision and Market Positioning

The discussion highlighted a market shift favoring authentic, human interactions over AI-driven automation and emphasized building differentiated client offerings (38:26, 41:36).

- Cam noted increasing AI content and automation saturation, warning that buyers prefer genuine human connections, making in-person and personalized outreach a strong competitive advantage (38:26).
- The team recognizes the crowded agency market and the need to differentiate through creative offers, like performance-based deals and niche-specific messaging, to cut through noise and win clients (25:22).
- Emphasis on diversified content strategies, including YouTube and podcasting, was discussed as a way to build authority, attract talent, and create sustainable demand over time (01:01:05).
- Cam's philosophy centers on "time in the market beats timing the market," encouraging consistent effort and follow-up as the path to long-term success (33:31).
- Team members are encouraged to build authentic brands aligned with their ideal clients, avoiding generic or overly polished messaging that attracts the wrong audience (17:48).`,
          embedUrl: "https://share.fireflies.ai/embed/meetings/01KB6J9WXW8YAXJDWBH07AY4A8"
        },
        { 
          id: "rec-2", 
          moduleId: "module-1", 
          title: "LC Group Call 11/20", 
          duration: "~45 min", 
          completed: false, 
          description: "Weekly group call discussion",
          embedUrl: "https://share.fireflies.ai/embed/meetings/01KAHZD1SWVAN3J5X6WX6BDHMA"
        },
        { 
          id: "rec-3", 
          moduleId: "module-1", 
          title: "LC Group Call 11/13", 
          duration: "~45 min", 
          completed: false, 
          description: "Weekly group call discussion",
          embedUrl: "https://share.fireflies.ai/embed/meetings/01K9ZZ0RCWY3Y36E6PBAMSTNWB"
        },
        { 
          id: "rec-4", 
          moduleId: "module-1", 
          title: "LC Group Call 11/6", 
          duration: "~45 min", 
          completed: false, 
          description: "Weekly group call discussion",
          embedUrl: "https://share.fireflies.ai/embed/meetings/01K9DXB7TGMMGXECZ6C265MFES"
        },
      ],
    },
  ]);

  // Course Materials Data
  const [materialsData, setMaterialsData] = useState<Module[]>([
    {
      id: "course-1",
      title: "Getting Started",
      lessons: [
        { id: "mat-1", moduleId: "course-1", title: "Introduction to the Platform", duration: "5:30", completed: true, description: "Welcome to the platform! Learn the basics and get oriented with the key features." },
        { id: "mat-2", moduleId: "course-1", title: "Setting Up Your Workspace", duration: "8:45", completed: false, description: "Step-by-step guide to configuring your workspace for optimal productivity." },
        { id: "mat-3", moduleId: "course-1", title: "Understanding the Interface", duration: "12:20", completed: false, description: "Deep dive into the user interface and navigation patterns." },
      ],
    },
    {
      id: "course-2",
      title: "Core Concepts",
      lessons: [
        { id: "mat-4", moduleId: "course-2", title: "Working with Projects", duration: "15:10", completed: false, description: "Learn how to create, manage, and organize projects effectively." },
        { id: "mat-5", moduleId: "course-2", title: "Advanced Features", duration: "18:30", completed: false, description: "Explore powerful advanced features to enhance your workflow." },
        { id: "mat-6", moduleId: "course-2", title: "Collaboration Tools", duration: "10:45", completed: false, description: "Master team collaboration and communication features." },
      ],
    },
    {
      id: "course-3",
      title: "Advanced Topics",
      lessons: [
        { id: "mat-7", moduleId: "course-3", title: "Automation & Workflows", duration: "22:15", completed: false, description: "Automate repetitive tasks and build custom workflows." },
        { id: "mat-8", moduleId: "course-3", title: "Integration Strategies", duration: "14:50", completed: false, description: "Connect with external tools and services seamlessly." },
        { id: "mat-9", moduleId: "course-3", title: "Best Practices", duration: "16:30", completed: false, description: "Learn industry best practices and optimization techniques." },
      ],
    },
  ]);

  // Get current modules based on content type
  const currentModules = contentType === "recordings" ? recordingsData : materialsData;
  const setCurrentModules = contentType === "recordings" ? setRecordingsData : setMaterialsData;

  const handleNewChat = () => {
    setChatId(null);
  };

  const handleCreateChat = (firstMessage: string) => {
    const newChatId = Date.now().toString();
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    
    const newChat: Chat = {
      id: newChatId,
      title,
      starred: false,
    };
    
    setChats([newChat, ...chats]);
    setChatId(newChatId);
  };

  const handleToggleLessonComplete = (lessonId: string) => {
    setCurrentModules(currentModules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson =>
        lesson.id === lessonId
          ? { ...lesson, completed: !lesson.completed }
          : lesson
      ),
    })));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {mode === "chat" ? (
        <div className="flex w-full animate-fade-in">
          <Sidebar 
            currentChatId={chatId} 
            onChatSelect={setChatId} 
            onNewChat={handleNewChat}
            chats={chats}
            setChats={setChats}
            isCollapsed={chatSidebarCollapsed}
            onCollapsedChange={setChatSidebarCollapsed}
            mode={mode}
            onModeChange={setMode}
          />
          <ChatInterface 
            chatId={chatId} 
            onNewChat={handleNewChat}
            onCreateChat={handleCreateChat}
          />
        </div>
      ) : (
        <div className="flex w-full animate-fade-in">
          <LearnSidebar
            currentLessonId={lessonId}
            onLessonSelect={setLessonId}
            contentType={contentType}
            onContentTypeChange={setContentType}
            modules={currentModules}
            isCollapsed={learnSidebarCollapsed}
            onCollapsedChange={setLearnSidebarCollapsed}
            mode={mode}
            onModeChange={setMode}
            onToggleLessonComplete={handleToggleLessonComplete}
          />
          <LearnInterface
            lessonId={lessonId}
            modules={currentModules}
            contentType={contentType}
          />
        </div>
      )}
    </div>
  );
};

export default Index;