/**
 * Générateur de pipeline GitLab CI pour ChangeProof CI.
 * Produit un fichier YAML prêt à copier dans .gitlab-ci.yml ou à inclure.
 */

export function generateGitlabCiYaml(apiUrl: string, threshold: number): string {
  const thresholdPercent = Math.round(threshold * 100)

  return `# Généré par ChangeProof AI — Pipeline CI/CD natif
# Ajoutez ceci à votre .gitlab-ci.yml ou créez un fichier dédié.

stages:
  - changeproof-check

changeproof-risk-check:
  stage: changeproof-check
  image: alpine/curl:latest
  rules:
    - if: \$CI_PIPELINE_SOURCE == "merge_request_event"
    - if: \$CI_COMMIT_BRANCH == "main" || \$CI_COMMIT_BRANCH == "master" || \$CI_COMMIT_BRANCH == "develop"
  script:
    - |
      RESPONSE=\$(curl -s -X POST "${apiUrl}" \\
        -H "Content-Type: application/json" \\
        -d "{\"changeId\": \"\${CI_COMMIT_SHA}\", \"projectId\": \"\${CHANGEPROOF_PROJECT_ID}\", \"apiToken\": \"\${CHANGEPROOF_API_TOKEN}\"}")
      
      echo "Response: \$RESPONSE"
      
      PASS=\$(echo "\$RESPONSE" | grep -o '"pass":[^,}]*' | head -1 | cut -d: -f2)
      SCORE=\$(echo "\$RESPONSE" | grep -o '"score":[^,}]*' | head -1 | cut -d: -f2)
      
      if [ "\$PASS" != "true" ]; then
        echo "❌ ChangeProof: Score de risque (\$SCORE) dépasse le seuil (${thresholdPercent}%)"
        echo "Recommendation: Veuillez résoudre les risques avant de merger."
        exit 1
      fi
      
      echo "✅ ChangeProof: Check de risque OK (score: \$SCORE, seuil: ${thresholdPercent}%)"
  allow_failure: false
`
}

/**
 * Génère les instructions de configuration des variables GitLab CI.
 */
export function generateGitlabVariablesGuide(): string {
  return `## Configuration des variables GitLab CI

Ajoutez les variables suivantes dans votre projet GitLab :
(Settings → CI/CD → Variables → Add variable)

1. **CHANGEPROOF_API_TOKEN** : Le token API généré dans les paramètres CI de ChangeProof (masqué)
2. **CHANGEPROOF_PROJECT_ID** : L'ID du projet ChangeProof à vérifier`
}
