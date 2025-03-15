# Random Software Principles Aggregator

A C# application that scrapes technical articles from various programming and development websites to collect interesting facts and articles. This project is meant for the Stage Three Tax in Telex integration, hosted on Render using Docker.

### Telex Integration

The scraper is designed to work as a Telex integration. When integrated with Telex:

1. The scraper automatically sends articles to your Telex channels
2. No manual API calls needed - Telex handles the webhook communication
3. Articles are posted at configured intervals

## Features

- Scrapes articles from multiple sources:
  - GeeksForGeeks (popular and recent articles)
  - MDN Web Docs (featured articles)
- Randomly selects articles from each source
- Extracts article titles, content, and URLs
- Error handling and logging for failed scraping attempts
- Summarizes articles and sends them to a Telex channel

## Project Structure

```
better-submitter/
├── Models/
│   ├── Fact.cs
│   ├── TelexWebhook.cs
│   └── TelexPayload.cs
├── Services/
│   ├── FactScraper.cs
│   └── integration.json
├── Properties/
│   └── launchSettings.json
├── Program.cs
├── Dockerfile
└── README.md
```

### Project Folders

- `Properties`: Contains project properties and settings.
- `Models`: Contains data models like `Fact`.
- `Services`: Contains service classes for scraping and integration.
- `Program.cs`: The startup point of the application.

## Implementation Details

### GeeksForGeeks Scraper

- Scrapes both popular and recent articles
- Extracts full article content
- Includes article preview and publication date
- Uses article container class selectors for reliable extraction

### MDN Scraper

- Focuses on featured articles from the MDN homepage
- Extracts article title, preview, and full content
- Handles relative URLs by converting them to absolute URLs
- Uses specific class selectors for reliable data extraction

## Deployment

The application is hosted on Render using Docker. For integration specs and the normal app, visit:

- [Integration Specs](https://sofware-principles-aggregator.onrender.com/integration.json)

## Repository

For more details, visit the [GitHub Repository](https://github.com/telexintegrations/sofware-principles-aggregator).
