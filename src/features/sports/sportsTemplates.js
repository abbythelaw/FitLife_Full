
export const SPORT_GROUPS = [
  {
    label: 'Core sports',
    sports: [
      'Walking', 'Hiking', 'Running', 'Trail Running',
      'Cycling', 'Indoor Cycling', 'Pool Swimming',
      'Open Water Swimming', 'Tennis', 'Badminton',
      'Pickleball', 'Strength Training'
    ]
  },
  {
    label: 'Hybrid and endurance',
    sports: [
      'Rowing', 'HIIT', 'Functional Fitness', 'Hyrox',
      'Spartan / OCR', 'Triathlon', 'Duathlon'
    ]
  },
  {
    label: 'Climbing and outdoor',
    sports: [
      'Climbing', 'Bouldering', 'Kayaking', 'Canoeing',
      'Golf', 'Skiing', 'Snowboarding'
    ]
  },
  {
    label: 'Team and combat',
    sports: [
      'Football', 'Basketball', 'Rugby', 'Volleyball',
      'Boxing', 'Martial Arts', 'BJJ / Grappling'
    ]
  },
  {
    label: 'Mind and body',
    sports: [
      'Yoga', 'Pilates', 'Mobility / Stretching', 'Dance'
    ]
  },
  {
    label: 'Other',
    sports: ['Other / Custom']
  }
]

const ENDURANCE = {
  fields: ['distance', 'averageHr', 'rpe'],
  optional: ['maxHr', 'elevation']
}

export const SPORT_TEMPLATES = {
  Walking: {
    fields: ['distance', 'duration', 'averageHr', 'rpe'],
    optional: ['steps', 'maxHr', 'elevation']
  },
  Hiking: {
    fields: ['distance', 'duration', 'averageHr', 'rpe'],
    optional: ['elevation', 'packWeight', 'maxHr']
  },
  Running: {...ENDURANCE},
  'Trail Running': {
    ...ENDURANCE,
    optional: ['maxHr', 'elevation', 'terrain']
  },
  Cycling: {
    ...ENDURANCE,
    optional: ['maxHr', 'elevation', 'cadence', 'power']
  },
  'Indoor Cycling': {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: ['distance', 'cadence', 'power', 'resistance']
  },
  'Pool Swimming': {
    fields: ['distance', 'duration', 'averageHr', 'rpe'],
    optional: ['poolLength', 'stroke', 'maxHr']
  },
  'Open Water Swimming': {
    ...ENDURANCE,
    optional: ['stroke', 'waterTemperature', 'maxHr']
  },
  Rowing: {
    ...ENDURANCE,
    optional: ['strokeRate', 'power', 'maxHr']
  },
  Tennis: {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: ['sessionType', 'format', 'score', 'opponent']
  },
  Badminton: {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: ['sessionType', 'format', 'score', 'opponent']
  },
  Pickleball: {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: ['sessionType', 'format', 'score', 'opponent']
  },
  'Strength Training': {
    fields: ['duration', 'rpe'],
    optional: ['averageHr', 'routine', 'sets', 'reps', 'weight']
  },
  HIIT: {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: ['rounds', 'workSeconds', 'restSeconds']
  },
  'Functional Fitness': {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: ['routine', 'rounds', 'reps']
  },
  Hyrox: {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: ['division', 'sessionType', 'placement', 'penalties']
  },
  'Spartan / OCR': {
    fields: ['distance', 'duration', 'averageHr', 'rpe'],
    optional: ['raceType', 'elevation', 'obstacles', 'penalties']
  },
  Triathlon: {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: [
      'swimDistance', 'bikeDistance', 'runDistance',
      'swimMinutes', 'bikeMinutes', 'runMinutes',
      'transitionMinutes', 'raceType'
    ]
  },
  Duathlon: {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: [
      'runDistance', 'bikeDistance', 'transitionMinutes', 'raceType'
    ]
  },
  Climbing: {
    fields: ['duration', 'rpe'],
    optional: ['averageHr', 'highestGrade', 'attempts', 'sends']
  },
  Bouldering: {
    fields: ['duration', 'rpe'],
    optional: ['averageHr', 'highestGrade', 'attempts', 'sends']
  },
  Kayaking: {...ENDURANCE},
  Canoeing: {...ENDURANCE},
  Golf: {
    fields: ['duration'],
    optional: ['holes', 'score', 'course', 'putts', 'averageHr']
  },
  Football: {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: ['sessionType', 'position', 'score', 'goals', 'assists']
  },
  Basketball: {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: ['sessionType', 'score', 'points', 'rebounds', 'assists']
  },
  Boxing: {
    fields: ['duration', 'averageHr', 'rpe'],
    optional: ['sessionType', 'rounds', 'roundMinutes']
  },
  Yoga: {
    fields: ['duration', 'rpe'],
    optional: ['style', 'averageHr']
  },
  Pilates: {
    fields: ['duration', 'rpe'],
    optional: ['style', 'averageHr']
  },
  'Mobility / Stretching': {
    fields: ['duration', 'rpe'],
    optional: ['bodyAreas']
  },
  'Other / Custom': {
    fields: ['duration', 'rpe'],
    optional: ['distance', 'averageHr', 'score']
  }
}

export function templateFor(name) {
  return SPORT_TEMPLATES[name] || {
    fields: ['duration', 'rpe'],
    optional: ['distance', 'averageHr', 'maxHr']
  }
}

export function sportHasField(template, field) {
  return template.fields.includes(field) ||
    template.optional.includes(field)
}
