targetScope = 'resourceGroup'

// ── Parameters ────────────────────────────────────────────────────────────────

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Short environment name used to suffix resource names (e.g. dev, prod)')
param environmentName string

@description('Neon PostgreSQL connection string — passed via azd env')
@secure()
param postgresConnectionString string

@description('Azure AI Foundry project name — used so Foundry can call this MCP server')
param foundryProjectName string = ''

// ── Variables ─────────────────────────────────────────────────────────────────

var resourceToken = toLower(uniqueString(resourceGroup().id, environmentName))
var tags = { 'azd-env-name': environmentName }

// ── Log Analytics (required by Container Apps Environment) ────────────────────

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${resourceToken}'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// ── Container Registry ────────────────────────────────────────────────────────

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'cr${resourceToken}'
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

// ── Container Apps Environment ────────────────────────────────────────────────

resource caEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'cae-${resourceToken}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ── Container App — MCP Server ────────────────────────────────────────────────

resource mcpServer 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-f1-mcp-${resourceToken}'
  location: location
  tags: union(tags, { 'azd-service-name': 'mcp-server' })
  properties: {
    managedEnvironmentId: caEnvironment.id
    configuration: {
      ingress: {
        external: true       // publicly reachable — Foundry calls it over HTTPS
        targetPort: 8080
        transport: 'http'
      }
      registries: [
        {
          server: registry.properties.loginServer
          username: registry.listCredentials().username
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: registry.listCredentials().passwords[0].value
        }
        {
          name: 'postgres-connection-string'
          value: postgresConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'mcp-server'
          image: '${registry.properties.loginServer}/f1-mcp-server:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'POSTGRES_CONNECTION_STRING'
              secretRef: 'postgres-connection-string'
            }
            {
              name: 'PORT'
              value: '8080'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 8080
              }
              initialDelaySeconds: 5
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0   // scale to zero when idle — free tier friendly
        maxReplicas: 2
      }
    }
  }
}

// ── Outputs (azd reads these) ─────────────────────────────────────────────────

output CONTAINER_APP_URL string = 'https://${mcpServer.properties.configuration.ingress.fqdn}'
output CONTAINER_REGISTRY_ENDPOINT string = registry.properties.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = registry.name
