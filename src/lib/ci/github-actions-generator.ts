/**
 * Générateur de workflow GitHub Actions pour ChangeProof CI.
 * Produit un fichier YAML prêt à copier dans .github/workflows/changeproof-check.yml
 */

export function generateWorkflowYaml(apiUrl: string, threshold: number): string {
  const thresholdPercent = Math.round(threshold * 100)

  return `# Généré par ChangeProof AI — Pipeline CI/CD natif
# Placez ce fichier dans : .github/workflows/changeproof-check.yml

name: ChangeProof Risk Check

on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches: [main, master, develop]

jobs:
  changeproof-check:
    runs-on: ubuntu-latest
    name: Analyse de risque ChangeProof
    steps:
      - name: Vérification du score de risque
        id: risk-check
        run: |
          # Récupérer le hash du dernier commit
          COMMIT_SHA="\${{ github.event.pull_request.head.sha || github.sha }}"
          
          RESPONSE=\$(curl -s -X POST "${apiUrl}" \\
            -H "Content-Type: application/json" \\
            -d "{\"changeId\": \"\$COMMIT_SHA\", \"projectId\": \"\${{ secrets.CHANGEPROOF_PROJECT_ID }}\", \"apiToken\": \"\${{ secrets.CHANGEPROOF_API_TOKEN }}\"}")
          
          echo "Response: \$RESPONSE"
          
          PASS=\$(echo "\$RESPONSE" | grep -o '"pass":[^,}]*' | head -1 | cut -d: -f2)
          SCORE=\$(echo "\$RESPONSE" | grep -o '"score":[^,}]*' | head -1 | cut -d: -f2)
          
          echo "pass=\$PASS" >> \$GITHUB_OUTPUT
          echo "score=\$SCORE" >> \$GITHUB_OUTPUT
          
          if [ "\$PASS" != "true" ]; then
            echo "❌ ChangeProof: Score de risque (\$SCORE) dépasse le seuil (${thresholdPercent}%)"
            echo "Recommendation: Veuillez résoudre les risques avant de merger."
            exit 1
          fi
          
          echo "✅ ChangeProof: Check de risque OK (score: \$SCORE, seuil: ${thresholdPercent}%)"

      - name: Résumé du check
        if: always()
        run: |
          echo "📊 Score de risque ChangeProof: \${{ steps.risk-check.outputs.score }}"
          echo "🔒 Seuil configuré: ${thresholdPercent}%"
`
}

/**
 * Génère les instructions de configuration des secrets GitHub.
 */
export function generateGitHubSecretsGuide(): string {
  return `## Configuration des secrets GitHub

Ajoutez les secrets suivants dans votre dépôt GitHub :
(Settings → Secrets and variables → Actions → New repository secret)

1. **CHANGEPROOF_API_TOKEN** : Le token API généré dans les paramètres CI de ChangeProof
2. **CHANGEPROOF_PROJECT_ID** : L'ID du projet ChangeProof à vérifier`
}
