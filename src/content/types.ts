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

export type CardKind = 'verse' | 'trivia' | 'fact' | 'map' | 'whosaid' | 'continue' | 'names'

export interface Favorite {
  kind: CardKind
  id: string
  title: string
  body: string
}
