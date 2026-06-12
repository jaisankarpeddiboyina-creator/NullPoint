/**
 * NullPoint — Semantic Router
 * Matches any query to the right tool groups.
 * The AI never sees tools it doesn't need. Context stays tight. Always.
 */

const GROUPS: Record<string, string[]> = {
  weather:       ['weather','temperature','forecast','rain','snow','wind','humidity','climate','storm','sunny','cold','hot','degrees','celsius','fahrenheit'],
  news:          ['news','latest','today','breaking','headline','article','report','hacker news','tech news','spaceflight'],
  finance:       ['crypto','bitcoin','ethereum','price','currency','exchange','dollar','euro','pound','market','coin','solana','usd','eur','gbp','rate','forex'],
  science:       ['nasa','space','research','paper','study','physics','chemistry','biology','astronomy','planet','star','arxiv','scientific','universe','quantum'],
  knowledge:     ['wikipedia','what is','who is','explain','define','history of','tell me about','facts about','information','learn','describe','overview'],
  books:         ['book','novel','author','literature','read','fiction','nonfiction','bestseller','library','isbn','publisher','biography','poetry'],
  entertainment: ['movie','film','tv','show','series','anime','watch','episode','season','actor','director','manga','animation','documentary','comedy','drama'],
  food:          ['food','recipe','meal','cook','eat','dish','ingredient','cuisine','dinner','lunch','breakfast','vegetarian','vegan','dessert','bake'],
  health:        ['health','disease','covid','virus','medicine','medical','symptom','treatment','vaccine','infection','cases','deaths','fda','drug'],
  maps:          ['where','location','country','city','map','address','coordinates','capital','population','continent','region','geography','flag','currency of'],
  art:           ['art','painting','artwork','artist','museum','gallery','sculpture','renaissance','impressionism','portrait','abstract','van gogh','picasso'],
  history:       ['history','historical','ancient','war','revolution','century','born','died','founded','battle','empire','civilization','on this day'],
  gaming:        ['pokemon','pokedex','pikachu','nintendo','game character','pokémon'],
  sports:        ['formula 1','f1','racing','championship','standings','driver','grand prix','ferrari','mercedes'],
  music:         ['music','song','album','band','singer','genre','track','concert','musician','rock','pop','jazz','hip hop','classical','discography'],
  language:      ['define','word','meaning','translate','translation','dictionary','synonym','antonym','pronunciation','spanish','french','german','japanese'],
  tech:          ['github','repository','open source','developer profile','stars','commits','programming','software'],
  security:      ['vulnerability','cve','security','exploit','breach','malware','cybersecurity','nvd','severity','attack'],
  quotes:        ['quote','saying','wisdom','inspiration','motivational','philosophy','stoic'],
  jobs:          ['job','career','hiring','remote work','salary','position','engineer','developer job','employment'],
  economy:       ['gdp','economic','world bank','poverty','development','inflation','growth rate','income','trade'],
  images:        ['generate image','create image','draw','picture of','visualize','ai art','illustration','image of','show me a photo'],
  animals:       ['dog','cat','puppy','kitten','cute animal','pet','breed'],
  jokes:         ['joke','funny','humor','laugh','comedy'],
}

function score(query: string, keywords: string[]): number {
  const q = query.toLowerCase()
  return keywords.reduce((s, kw) => s + (q.includes(kw) ? (kw.length > 6 ? 3 : kw.length > 3 ? 2 : 1) : 0), 0)
}

export function routeQuery(query: string, max = 3): string[] {
  const scored = Object.entries(GROUPS)
    .map(([group, kws]) => ({ group, score: score(query, kws) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(x => x.group)

  if (scored.length === 0) return ['knowledge', 'news']

  const isFactual = /^(what|who|where|when|why|how|tell me|explain)/i.test(query.trim())
  if (isFactual && !scored.includes('knowledge')) scored.push('knowledge')

  return scored
}
