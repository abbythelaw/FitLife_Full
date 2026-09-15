
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

export const SPORT_EMOJIS = {
  Walking: '🚶',
  Hiking: '🥾',
  Running: '🏃',
  'Trail Running': '⛰️',
  Cycling: '🚴',
  'Indoor Cycling': '🚲',
  Swimming: '🏊',
  'Pool Swimming': '🏊',
  'Open Water Swimming': '🌊',
  Rowing: '🚣',
  Kayaking: '🛶',
  Canoeing: '🛶',
  Tennis: '🎾',
  'Tennis / Padel': '🎾',
  Badminton: '🏸',
  Pickleball: '🏓',
  Squash: '🎾',
  'Table Tennis': '🏓',
  Strength: '🏋️',
  'Strength Training': '🏋️',
  HIIT: '⚡',
  'Functional Fitness': '💪',
  Hyrox: '🔥',
  'Spartan / OCR': '🛡️',
  Triathlon: '🏅',
  Duathlon: '🏅',
  Football: '⚽',
  Basketball: '🏀',
  Rugby: '🏉',
  Volleyball: '🏐',
  Boxing: '🥊',
  'Martial Arts': '🥋',
  'BJJ / Grappling': '🤼',
  Climbing: '🧗',
  Bouldering: '🪨',
  Golf: '⛳',
  Skiing: '🎿',
  Snowboarding: '🏂',
  Yoga: '🧘',
  Pilates: '🤸',
  'Mobility / Stretching': '🤲',
  Dance: '💃',
  Other: '⭐',
  'Other / Custom': '⭐'
}

export function sportEmoji(category) {
  return SPORT_EMOJIS[category] || '🏅'
}

const COMMON = [
  {
    key: 'duration',
    field: 'duration_minutes',
    direction: 'max',
    label: 'Longest session',
    metric: 'duration'
  },
  {
    key: 'calories',
    field: 'calories',
    direction: 'max',
    label: 'Highest-calorie session',
    metric: 'calories'
  }
]

const RECORD_CONFIG = {
  Walking: [
    {
      key: 'distance',
      field: 'distance_km',
      direction: 'max',
      label: 'Longest walk',
      metric: 'distance'
    },
    {
      key: 'pace',
      field: 'pace_min_km',
      direction: 'min',
      label: 'Fastest walk',
      metric: 'pace'
    },
    ...COMMON,
    {
      key: 'steps',
      detail: 'steps',
      direction: 'max',
      label: 'Most steps',
      metric: 'steps'
    }
  ],
  Hiking: [
    {
      key: 'elevation',
      detail: 'elevation',
      direction: 'max',
      label: 'Highest elevation gain',
      metric: 'elevation'
    },
    {
      key: 'distance',
      field: 'distance_km',
      direction: 'max',
      label: 'Longest hike',
      metric: 'distance'
    },
    ...COMMON
  ],
  Running: [
    {
      key: 'pace',
      field: 'pace_min_km',
      direction: 'min',
      label: 'Fastest run',
      metric: 'pace'
    },
    {
      key: 'distance',
      field: 'distance_km',
      direction: 'max',
      label: 'Longest run',
      metric: 'distance'
    },
    ...COMMON
  ],
  'Trail Running': [
    {
      key: 'elevation',
      detail: 'elevation',
      direction: 'max',
      label: 'Highest elevation gain',
      metric: 'elevation'
    },
    {
      key: 'distance',
      field: 'distance_km',
      direction: 'max',
      label: 'Longest trail run',
      metric: 'distance'
    },
    {
      key: 'pace',
      field: 'pace_min_km',
      direction: 'min',
      label: 'Fastest trail run',
      metric: 'pace'
    },
    ...COMMON
  ],
  Cycling: [
    {
      key: 'distance',
      field: 'distance_km',
      direction: 'max',
      label: 'Longest ride',
      metric: 'distance'
    },
    {
      key: 'speed',
      field: 'average_speed_kmh',
      direction: 'max',
      label: 'Fastest ride',
      metric: 'speed'
    },
    ...COMMON
  ],
  'Indoor Cycling': [
    ...COMMON,
    {
      key: 'hr',
      field: 'average_hr',
      direction: 'max',
      label: 'Highest average HR',
      metric: 'averageHr'
    }
  ],
  Swimming: [
    {
      key: 'distance',
      field: 'distance_km',
      direction: 'max',
      label: 'Longest swim',
      metric: 'distance'
    },
    {
      key: 'pace',
      field: 'pace_min_km',
      direction: 'min',
      label: 'Fastest swim',
      metric: 'pace'
    },
    ...COMMON
  ],
  'Pool Swimming': [
    {
      key: 'distance',
      field: 'distance_km',
      direction: 'max',
      label: 'Longest pool swim',
      metric: 'distance'
    },
    {
      key: 'pace',
      field: 'pace_min_km',
      direction: 'min',
      label: 'Fastest pool swim',
      metric: 'pace'
    },
    ...COMMON
  ],
  'Open Water Swimming': [
    {
      key: 'distance',
      field: 'distance_km',
      direction: 'max',
      label: 'Longest open-water swim',
      metric: 'distance'
    },
    {
      key: 'pace',
      field: 'pace_min_km',
      direction: 'min',
      label: 'Fastest open-water swim',
      metric: 'pace'
    },
    ...COMMON
  ],
  Rowing: [
    {
      key: 'distance',
      field: 'distance_km',
      direction: 'max',
      label: 'Longest row',
      metric: 'distance'
    },
    {
      key: 'pace',
      field: 'pace_min_km',
      direction: 'min',
      label: 'Best rowing split',
      metric: 'pace'
    },
    ...COMMON
  ],
  Tennis: [
    {
      ...COMMON[0],
      label: 'Longest tennis session'
    },
    {
      ...COMMON[1],
      label: 'Highest-calorie tennis session'
    }
  ],
  'Tennis / Padel': [
    {
      ...COMMON[0],
      label: 'Longest tennis session'
    },
    {
      ...COMMON[1],
      label: 'Highest-calorie tennis session'
    }
  ],
  Badminton: [
    {
      ...COMMON[0],
      label: 'Longest badminton session'
    },
    {
      ...COMMON[1],
      label: 'Highest-calorie badminton session'
    }
  ],
  Pickleball: [
    {
      ...COMMON[0],
      label: 'Longest pickleball session'
    },
    {
      ...COMMON[1],
      label: 'Highest-calorie pickleball session'
    }
  ],
  'Strength Training': [
    {
      key: 'load',
      field: 'training_load',
      direction: 'max',
      label: 'Highest training load',
      metric: 'trainingLoad'
    },
    {
      ...COMMON[0],
      label: 'Longest strength session'
    },
    COMMON[1]
  ],
  Strength: [
    {
      key: 'load',
      field: 'training_load',
      direction: 'max',
      label: 'Highest training load',
      metric: 'trainingLoad'
    },
    {
      ...COMMON[0],
      label: 'Longest strength session'
    },
    COMMON[1]
  ],
  Hyrox: [
    {
      key: 'completion',
      field: 'duration_minutes',
      direction: 'min',
      label: 'Fastest Hyrox completion',
      metric: 'duration'
    },
    {
      key: 'load',
      field: 'training_load',
      direction: 'max',
      label: 'Highest Hyrox load',
      metric: 'trainingLoad'
    },
    COMMON[1]
  ],
  'Spartan / OCR': [
    {
      key: 'completion',
      field: 'duration_minutes',
      direction: 'min',
      label: 'Fastest OCR completion',
      metric: 'duration'
    },
    {
      key: 'distance',
      field: 'distance_km',
      direction: 'max',
      label: 'Longest OCR',
      metric: 'distance'
    },
    {
      key: 'elevation',
      detail: 'elevation',
      direction: 'max',
      label: 'Highest OCR elevation',
      metric: 'elevation'
    }
  ],
  Bouldering: [
    {
      key: 'sends',
      detail: 'sends',
      direction: 'max',
      label: 'Most bouldering sends',
      metric: 'sends'
    },
    {
      ...COMMON[0],
      label: 'Longest bouldering session'
    },
    COMMON[1]
  ],
  Golf: [
    {
      key: 'score',
      detail: 'score',
      direction: 'min',
      label: 'Best golf score',
      metric: 'score'
    },
    {
      key: 'holes',
      detail: 'holes',
      direction: 'max',
      label: 'Most holes played',
      metric: 'holes'
    }
  ]
}

function configForSport(category) {
  return RECORD_CONFIG[category] || COMMON
}

function numericValue(entry, config) {
  const raw = config.detail
    ? entry?.sport_details?.[config.detail]
    : entry?.[config.field]

  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

function validDate(entry) {
  const value = new Date(`${entry.entry_date || entry.date}T12:00:00`)
  return Number.isNaN(value.getTime()) ? null : value
}

function isWinner(entry, candidates, config) {
  const eligible = candidates
    .map(candidate => ({
      entry: candidate,
      value: numericValue(candidate, config),
      date: validDate(candidate)
    }))
    .filter(item =>
      item.value !== null &&
      item.date !== null
    )

  if (eligible.length < 2) return false

  eligible.sort((left, right) => {
    const valueDifference =
      config.direction === 'min'
        ? left.value - right.value
        : right.value - left.value

    if (valueDifference !== 0) {
      return valueDifference
    }

    // A tied record remains with the earliest activity.
    const dateDifference =
      left.date.getTime() -
      right.date.getTime()

    if (dateDifference !== 0) {
      return dateDifference
    }

    return String(left.entry.id || '')
      .localeCompare(String(right.entry.id || ''))
  })

  const winner = eligible[0]?.entry

  return String(winner?.id) === String(entry?.id)
}

export function recordsForEntry(
  entry,
  allEntries = []
) {
  if (!entry?.category) return []

  const entryDate = validDate(entry)

  if (!entryDate) return []

  /*
   * Use the complete exact-sport dataset.
   * This prevents an old record holder from continuing to display
   * Best Ever after a later activity has surpassed it.
   */
  const exactSport = allEntries
    .filter(candidate =>
      candidate?.category === entry.category &&
      validDate(candidate)
    )
    .sort((left, right) =>
      validDate(left) - validDate(right)
    )

  if (exactSport.length < 2) {
    return []
  }

  const year = entryDate.getFullYear()

  const calendarYearEntries = exactSport.filter(
    candidate =>
      validDate(candidate)?.getFullYear() === year
  )

  const achievements = []

  for (const config of configForSport(entry.category)) {
    const everWinner = isWinner(
      entry,
      exactSport,
      config
    )

    if (everWinner) {
      achievements.push({
        id: `${config.key}-ever`,
        key: config.key,
        metric: config.metric,
        level: 'ever',
        icon: '🏆',
        label: `${config.label} ever`,
        value: numericValue(entry, config),
        periodLabel: 'Best Ever'
      })
    }

    const yearWinner =
      calendarYearEntries.length >= 2 &&
      isWinner(
        entry,
        calendarYearEntries,
        config
      )

    if (yearWinner) {
      achievements.push({
        id: `${config.key}-year-${year}`,
        key: config.key,
        metric: config.metric,
        level: 'year',
        icon: '🥇',
        label:
          `${config.label} this year · ${year}`,
        value: numericValue(entry, config),
        year,
        periodLabel: `Best in ${year}`
      })
    }
  }

  return achievements.sort((left, right) => {
    if (left.level === right.level) return 0

    return left.level === 'ever' ? -1 : 1
  })
}

export function recordsForMetric(achievements, metric) {
  return achievements.filter(record => record.metric === metric)
}

export function hasRecord(achievements, metric) {
  const records = recordsForMetric(achievements, metric)

  if (!records.length) return null

  return {
    ...records[0],
    records,
    icons: records.map(record => record.icon).join(''),
    hasEver: records.some(record => record.level === 'ever'),
    hasYear: records.some(record => record.level === 'year'),
    level: records.some(record => record.level === 'ever')
      ? 'ever'
      : 'year'
  }
}

