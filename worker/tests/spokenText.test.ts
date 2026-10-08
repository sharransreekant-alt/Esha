import { describe, it, expect } from 'vitest'
import { spokenText } from '../src/index'

describe('reading the sentence from a hand-built shortcut', () => {
  it.each([
    ['{"text":"wee and a poo"}', 'application/json'],
    ['{"Text":"wee and a poo"}', 'application/json'],
    ['{"Dictated Text":"wee and a poo"}', 'application/json'],
    ['"wee and a poo"', 'application/json'],
    ['text=wee+and+a+poo', 'application/x-www-form-urlencoded'],
    ['Text=wee%20and%20a%20poo', 'application/x-www-form-urlencoded'],
    ['wee and a poo', 'text/plain'],
    ['  wee and a poo \n', ''],
  ])('%s', (body, type) => {
    expect(spokenText(body, type)).toBe('wee and a poo')
  })

  it.each([['', ''], ['{}', 'application/json'], ['{"text":""}', 'application/json'], ['{"text":"  "}', 'application/json'], ['{"a":"x","b":"y"}', 'application/json'], ['[1,2]', 'application/json']])(
    'finds nothing in %s', (body, type) => { expect(spokenText(body, type)).toBeNull() })
})
