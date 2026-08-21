module.exports = {
  parserPreset: {
    parserOpts: {
      headerPattern: /^(T\d{2})\/(S[123]): (.{5,60})$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
  rules: {
    'header-max-length': [2, 'always', 68],
    'type-empty': [2, 'never'],
    'scope-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
  },
}
