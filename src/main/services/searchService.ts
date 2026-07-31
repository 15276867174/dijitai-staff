interface SearchResult {
  title: string
  url: string
  snippet: string
}

export class SearchService {
  async search(query: string): Promise<{ results: SearchResult[] }> {
    // Placeholder web search implementation
    // Integrate with DuckDuckGo / Bing / Baidu API
    return {
      results: [
        {
          title: `搜索: ${query}`,
          url: '',
          snippet: '联网搜索功能将在配置API后启用'
        }
      ]
    }
  }
}
