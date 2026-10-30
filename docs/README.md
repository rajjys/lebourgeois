# Clerikaa documentation

Start with the plan. Each other document goes deep on one part of it.

| Document | What it answers | Read it when |
|---|---|---|
| [PLAN.md](PLAN.md) | Where the project is going, what is done, what comes next, every decision and why | Always first |
| [ROUTE-MODEL.md](ROUTE-MODEL.md) | How routes, airlines, flights and prices are modelled; how the back office manages a route; the RW-1 → RW-7 build plan | Before touching schedules, the back office or route pages |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Brand, colours, type, components and data display rules; live at `/dashboard/design` | Before building any screen |
| [SEO-AEO-GEO.md](SEO-AEO-GEO.md) | Binding rules for every public page: URLs, content, structured data, crawlers, AI engines | Before building or changing a public page |
| [DATA-SOURCES.md](DATA-SOURCES.md) | Where data comes from; OAG/Cirium and other vendors; the airlines' systems and the partnership plan | Before adding a source or contacting an airline |

**Rules for all documents**
- Facts carry a source and a date. Assumptions say so.
- A PR that changes a decision, a status or a rule updates the document in the same PR.
- Plain English, short sentences. These files are written for anyone who joins the project.
