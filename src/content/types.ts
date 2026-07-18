export type VerseTuple = [string, number, number, string]

export type CuratedRef = [b: string, c: number, v: number, end?: number]

export interface TriviaItem {
  id: string
  q: string
  choices: string[]
  answer: number
  why: string
  ref: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface FactItem {
  id: string
  title: string
  body: string
  ref: string
}

export interface WhoSaidItem {
  id: string
  quote: string
  choices: string[]
  answer: number
  why: string
  ref: string
}

export interface ContinueItem {
  id: string
  stem: string
  endings: string[]
  sources: string[]
  answer: number
  why: string
  ref: string
}

export interface PrayerItem {
  id: string
  prompt: string
  ref: string
}

export interface NamesItem {
  id: string
  name: string
  original: string
  language: 'Hebrew' | 'Greek' | 'Aramaic'
  meaning: string
  body: string
  refs: string[]
}

export interface Place {
  name: string
  lat: number
  lon: number
}

export interface MapStory {
  id: string
  title: string
  body: string
  ref: string
  places: Place[]
  route: boolean
}

export interface ProphecyItem {
  id: string
  prophecyRef: string
  fulfillmentRef: string
  note: string
}

export interface HymnItem {
  id: string
  title: string
  author: string
  year: number
  stanza: string
  story: string
  ref: string
}

export interface TimelineItem {
  id: string
  title: string
  when: string
  position: number
  blurb: string
  ref: string
}

export interface WordItem {
  id: string
  strongs: string
  word: string
  translit: string
  language: 'Hebrew' | 'Greek' | 'Aramaic'
  gloss: string
  body: string
  refs: string[]
}

export type CardKind = 'verse' | 'trivia' | 'fact' | 'map' | 'whosaid' | 'continue' | 'names' | 'prophecy' | 'hymn' | 'timeline' | 'word'

export interface Favorite {
  kind: CardKind
  id: string
  title: string
  body: string
}
