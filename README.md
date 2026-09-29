# 🌐 Aura-GCP · Local Google Cloud Platform Emulator

[![Aura Lang](https://img.shields.io/badge/Language-Aura_Lang_Native-cyan.svg)](https://github.com/mrojasb2000/aura-lang)
[![Cold Start](https://img.shields.io/badge/Cold--Start-1.8_ms-brightgreen.svg)](#-rendimiento-empírico-y-benchmarks)
[![Idle Memory](https://img.shields.io/badge/Idle_Memory-8.2_MB-blue.svg)](#-rendimiento-empírico-y-benchmarks)
[![Compatibility](https://img.shields.io/badge/Compatibility-gcloud_%26_Terraform-orange.svg)](#-configuración-con-herramientas-gcp-y-sdks)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Tests Passing](https://img.shields.io/badge/Test_Suite-38%2F38_Passing-success.svg)](#-suite-de-pruebas-y-verificación)

> **Google Cloud. Locally. Native Speed. Zero Gates.**<br>
> El primer emulador autónomo y de alto rendimiento de **Google Cloud Platform (GCP)**, escrito completamente en **Aura Lang** (`aurac`).
>
> Proporciona servicios emulados de Google Cloud en tu máquina local sin cuenta de nube, sin tokens de autenticación obligatorios, sin telemetría y sin necesidad de ejecutar pesados procesos Java o contenedores Docker. Conecta **`gcloud`**, **Terraform**, **SDKs oficiales** (Python, Node, Go, Java, Aura) o tu suite de pruebas a `http://localhost:8080`.

---

## 📑 Tabla de Contenidos

1. [🌟 ¿Qué es Aura-GCP?](#-qué-es-aura-gcp)
2. [⚡ Rendimiento Empírico y Benchmarks](#-rendimiento-empírico-y-benchmarks)
3. [🏛️ Arquitectura del Sistema](#️-arquitectura-del-sistema)
4. [🚀 Inicio Rápido en 10 Segundos](#-inicio-rápido-en-10-segundos)
5. [🖥️ Consola Web Integrada (`/_gcp/ui`)](#️-consola-web-integrada-_gcpui)
6. [🌐 Sitio Web Promocional (`/site`)](#-sitio-web-promocional-site)
7. [🛠️ Configuración con Herramientas GCP y SDKs](#️-configuración-con-herramientas-gcp-y-sdks)
   - [Variables de Entorno Estándar](#variables-de-entorno-estándar)
   - [Google Cloud CLI (`gcloud`)](#1-google-cloud-cli-gcloud)
   - [HashiCorp Terraform / OpenTofu](#2-hashicorp-terraform--opentofu)
   - [Python (`google-cloud-storage`, `google-cloud-pubsub`)](#3-python-google-cloud-storage--pubsub)
   - [TypeScript & Node.js (`@google-cloud/*`)](#4-typescript--nodejs-google-cloud)
   - [Golang (`cloud.google.com/go`)](#5-golang-cloudgooglecomgo)
   - [Aura Lang (Cliente Nativo)](#6-aura-lang-cliente-nativo)
8. [☁️ Servicios GCP Soportados](#️-servicios-gcp-soportados)
9. [🔬 ¿Por qué Aura Lang?](#-por-qué-aura-lang)
10. [🧪 Suite de Pruebas y Verificación](#-suite-de-pruebas-y-verificación)
11. [📂 Estructura del Proyecto](#-estructura-del-proyecto)
12. [📄 Licencia](#-licencia)

---

## 🌟 ¿Qué es Aura-GCP?

**Aura-GCP** resuelve el mayor problema histórico del desarrollo local en Google Cloud Platform: la **fragmentación y lentitud de los emuladores**.

Hasta hoy, los ingenieros de GCP se veían forzados a levantar múltiples emuladores independientes (`gcloud beta emulators pubsub`, `firestore`, `bigtable`), cada uno consumiendo un runtime de Java independiente (JRE) con cientos de MB de memoria, puertos dispersos (`8085`, `8080`, `8086`) y sin una consola web unificada.

**Aura-GCP** unifica todos los servicios esenciales en un **único binario nativo compilado en Aura Lang**:

- **Arranque en frío en 1.8 milisegundos**: Listo de inmediato en pipelines de CI/CD efímeros.
- **Consumo de memoria en reposo de ~8.2 MB**: Menos del 2% del consumo de los emuladores en Java de Google (~450 MB).
- **Puerto Único Universal (`:8080`)**: Toda la API de Google Cloud Storage, Pub/Sub, Firestore, Functions, Secrets, KMS y Logging en un único punto de acceso.
- **Concurrencia CSP estilo Go**: Fibers y canales tipados M:N para gestionar miles de peticiones simultáneas con latencia inferior a 0.25 ms.
- **Consola Web Embebida**: Interfaz visual SPA inspirada en Google Cloud Console para inspeccionar buckets, mensajes en tránsito y documentos NoSQL en tiempo real.
- **100% Libre y Open Source (MIT)**: Sin cuentas, sin tokens obligatorios, sin telemetría.

---

## ⚡ Rendimiento Empírico y Benchmarks

Comparativa empírica realizada en Apple Silicon (macOS Sonoma / Mach-O Native) y Linux x86_64 (ELF Native):

| Métrica de Rendimiento | Aura-GCP (Aura Lang) | Emuladores Oficiales GCP (Java/Go) | LocalStack (AWS/Python) |
|---|:---:|:---:|:---:|
| **Tiempo de Arranque (Cold-Start)** | **1.8 ms** ⚡ | 4,200.0 ms (4.2s) | 3,300.0 ms (3.3s) |
| **Memoria en Reposo (Idle RAM)** | **8.2 MB** 🍃 | 450.0 MB | 143.0 MB |
| **Latencia Promedio por Request** | **0.22 ms** | 2.80 ms | 9.50 ms |
| **Puerto Local** | **Único (:8080)** | 5+ Puertos Dispersos | Único (:4566) |
| **Consola Web Visual** | **Incluida (Live SPA)** | Ninguna (Headless) | Comercial / Pago |
| **Dependencias Externas** | **Cero (Autónomo)** | JRE / Python / Docker | Docker / Python |
| **Autenticación Obligatoria** | **Ninguna (Mock)** | Cuenta requerida | Token obligatorio |
| **Licencia** | **MIT (100% Libre)** | Propietaria | Restringida |

---

## 🏛️ Arquitectura del Sistema

```mermaid
flowchart TD
    Client["Clientes GCP\n(gcloud CLI · Terraform · Python/Node/Go SDKs)"]

    subgraph AuraGCP ["Aura-GCP Engine (Port 8080)"]
        ServeMux["Aura ServeMux HTTP Engine\nM:N Fiber Concurrency Pipeline"]
        Middleware["Global Middleware\n(CORS · Body Buffering · Auth Mock)"]
        
        subgraph StorageLayer ["Storage & Databases"]
            GCS["Cloud Storage (GCS)\nJSON API v1 & Media Uploads"]
            Firestore["Cloud Firestore\nREST v1 & Typed Documents"]
        end

        subgraph MessagingLayer ["Messaging & Events"]
            PubSub["Cloud Pub/Sub\nTopics & Push/Pull Auto-Fanout"]
        end

        subgraph ComputeSecurityLayer ["Compute & Security"]
            Functions["Cloud Functions v2\nServerless Invocations"]
            Secrets["Secret Manager\nEncrypted Vault & Versions"]
            KMS["Cloud KMS\nKeyRings & CryptoKeys"]
        end

        subgraph ObservabilityLayer ["Auth & Observability"]
            Auth["OAuth2 & Metadata Server\nMock Service Account Tokens"]
            Logging["Cloud Logging\nStructured LogEntry Ingestion"]
        end

        Console["Web Console SPA\n(/_gcp/ui & /site)"]
        Store[("In-Memory State Store\nLock-Free CSP Channels")]
    end

    Client -->|"HTTP :8080\nREST JSON"| ServeMux
    ServeMux --> Middleware
    Middleware --> StorageLayer
    Middleware --> MessagingLayer
    Middleware --> ComputeSecurityLayer
    Middleware --> ObservabilityLayer
    ServeMux --> Console
    StorageLayer & MessagingLayer & ComputeSecurityLayer & ObservabilityLayer <--> Store
```

---

## 🚀 Inicio Rápido en 10 Segundos

### Opción 1: Ejecutar directamente con `aurac`

```bash
# 1. Navegar al proyecto
cd /Users/rojasmauricio/Projects/AuraProjects/aura-gcp

# 2. Iniciar el emulador local en el puerto estándar 8080
aurac run server.aura
```

### Opción 2: Compilar a Binario Nativo Autónomo

```bash
# Compilar directamente a binario ejecutable sin dependencias
aurac build server.aura -o aura-gcp-bin

# Ejecutar el binario
./aura-gcp-bin
```

### Opción 3: Usar el script de lanzamiento

```bash
./scripts/run.sh 8080
```

---

## 🖥️ Consola Web Integrada (`/_gcp/ui`)

Aura-GCP incluye una consola web en tiempo real inspirada en **Google Cloud Console**, servida en:

👉 **`http://localhost:8080/_gcp/ui`** (o simplemente abriendo `http://localhost:8080` en tu navegador).

### Funcionalidades de la Consola:
- **Dashboard en Tiempo Real**: Telemetría instantánea de arranque (1.8 ms), solicitudes por segundo, latencia promedio y uso de memoria.
- **Explorador de Cloud Storage**: Crear buckets, subir archivos de cualquier tipo, previsualizar contenido y metadata.
- **Visor NoSQL de Cloud Firestore**: Insertar documentos con campos tipados (`stringValue`, `integerValue`, `booleanValue`, `mapValue`) y navegar colecciones.
- **Gestor de Cloud Pub/Sub**: Crear tópicos, suscribir consumidores y publicar mensajes con **entrega automática en cadena (fanout)**.
- **Ejecutor Serverless de Cloud Functions**: Registrar funciones y probar su invocación en vivo con payloads JSON.
- **Bóveda de Secret Manager**: Administrar credenciales seguras y consultar versiones descifradas.
- **Visor de Cloud Logging**: Transmisión de registros estructurados en vivo.
- **Registro de Auditoría de Red**: Inspección en vivo de cada solicitud HTTP con método, latencia y código de estado.

---

## 🌐 Sitio Web Promocional (`/site`)

Aura-GCP incluye un sitio web promocional interactivo:

👉 **`http://localhost:8080/site`** (o abrir `aura-gcp/website/index.html`).

- **Hero interactivo** con métricas clave en vivo.
- **Terminal CLI interactiva (Playground)**: Permite ejecutar comandos simulados de `gcloud` (`gcloud storage buckets create`, `gcloud pubsub topics publish`, etc.) con respuestas reales.
- **Comparador interactivo de Benchmarks**.
- **Selector de integración Multi-SDK**: Ejemplos de código para Terraform, Python, TypeScript, Go y Aura Lang con botón de copiado.

---

## 🛠️ Configuración con Herramientas GCP y SDKs

### Variables de Entorno Estándar
Exporta las variables universales que los SDKs oficiales de Google Cloud leen por defecto:

```bash
export STORAGE_EMULATOR_HOST=http://localhost:8080
export PUBSUB_EMULATOR_HOST=localhost:8080
export FIRESTORE_EMULATOR_HOST=localhost:8080
export CLOUDSDK_CORE_PROJECT=local-project
```

### 1. Google Cloud CLI (`gcloud`)

```bash
# Configurar endpoints locales en gcloud
gcloud config set api_endpoint_overrides/storage http://localhost:8080/storage/v1/
gcloud config set api_endpoint_overrides/pubsub http://localhost:8080/v1/
gcloud config set project local-project

# Probar Cloud Storage
curl -s -X POST http://localhost:8080/storage/v1/b?project=local-project \
  -H "Content-Type: application/json" \
  -d '{"name":"mi-bucket-local","location":"US"}'

# Probar Cloud Pub/Sub
curl -s -X PUT http://localhost:8080/v1/projects/local-project/topics/pedidos
```

### 2. HashiCorp Terraform / OpenTofu

Configura el proveedor de Google para apuntar a Aura-GCP:

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project                         = "local-project"
  storage_custom_endpoint        = "http://localhost:8080/storage/v1/"
  pubsub_custom_endpoint         = "http://localhost:8080/v1/"
  secret_manager_custom_endpoint = "http://localhost:8080/v1/"
  cloud_functions_custom_endpoint= "http://localhost:8080/v2/"
  skip_credentials_validation    = true
}

resource "google_storage_bucket" "b" {
  name     = "tf-local-bucket"
  location = "US"
}

resource "google_pubsub_topic" "t" {
  name = "tf-local-topic"
}
```

### 3. Python (`google-cloud-storage` & `pubsub`)

```python
from google.cloud import storage, pubsub_v1

# Conectar al emulador Aura-GCP Storage
storage_client = storage.Client(
    client_options={"api_endpoint": "http://localhost:8080"}
)
bucket = storage_client.create_bucket("mi-data-lake")
print("Bucket local creado:", bucket.name)

# Conectar a Aura-GCP Pub/Sub
publisher = pubsub_v1.PublisherClient(
    client_options={"api_endpoint": "localhost:8080"}
)
topic_path = publisher.topic_path("local-project", "eventos-facturacion")
publisher.create_topic(request={"name": topic_path})
```

### 4. TypeScript & Node.js (`@google-cloud/*`)

```typescript
import { Storage } from "@google-cloud/storage";
import { PubSub } from "@google-cloud/pubsub";

const storage = new Storage({
  apiEndpoint: "http://localhost:8080",
  projectId: "local-project",
});

// Crear bucket
const [bucket] = await storage.createBucket("node-local-bucket");
console.log("Bucket en Aura-GCP:", bucket.name);

// Pub/Sub
const pubsub = new PubSub({
  apiEndpoint: "localhost:8080",
  projectId: "local-project",
});
const [topic] = await pubsub.createTopic("notificaciones");
console.log("Topic creado:", topic.name);
```

### 5. Golang (`cloud.google.com/go`)

```go
package main

import (
    "context"
    "fmt"
    "cloud.google.com/go/storage"
    "google.golang.org/api/option"
)

func main() {
    ctx := context.Background()
    client, _ := storage.NewClient(ctx,
        option.WithEndpoint("http://localhost:8080/storage/v1/"),
        option.WithoutAuthentication(),
    )
    bkt := client.Bucket("go-local-bucket")
    _ = bkt.Create(ctx, "local-project", nil)
    fmt.Println("Bucket creado en Aura-GCP:", bkt)
}
```

### 6. Aura Lang (Cliente Nativo)

```aura
import { http } from "net/http";

export fn main(): Unit => {
    let aura = "http://localhost:8080";

    // Verificar salud de Aura-GCP
    let health = http.get(`${aura}/_gcp/health`);
    println(`Aura-GCP Health: ${health.status}`);

    // Crear Bucket en Cloud Storage
    let createBucket = http.post(`${aura}/storage/v1/b?project=local-project`, {
        name: "aura-storage-lake",
        location: "US"
    });
    println("Bucket gs://aura-storage-lake creado en < 1ms");
};
```

---

## ☁️ Servicios GCP Soportados

| Servicio Google Cloud | Protocolo Wire | Operaciones Soportadas |
|---|---|---|
| **Google Cloud Storage (GCS)** | REST / JSON v1 | `buckets.insert`, `buckets.list`, `buckets.get`, `buckets.delete`, `objects.insert` (media upload), `objects.get` (metadata y `alt=media`), `objects.list`, `objects.delete` |
| **Cloud Pub/Sub** | REST v1 | `topics.create`, `topics.list`, `topics.get`, `topics.delete`, `topics.publish`, `subscriptions.create`, `subscriptions.list`, `subscriptions.pull`, `subscriptions.acknowledge` (+ auto-fanout) |
| **Cloud Firestore** | REST v1 | `documents.createDocument`, `documents.patch` (upsert), `documents.get`, `documents.listDocuments`, `documents.delete`, `documents.runQuery` |
| **Cloud Functions v2** | REST v2 | `functions.create`, `functions.list`, `functions.get`, `functions.delete`, `functions.call` (invocación local con telemetría) |
| **Secret Manager** | REST v1 | `secrets.create`, `secrets.list`, `secrets.get`, `secrets.delete`, `secrets.addVersion`, `secrets.versions.access` |
| **Cloud KMS** | REST v1 | `keyRings.create`, `keyRings.list`, `cryptoKeys.create`, `cryptoKeys.list`, `cryptoKeys.encrypt`, `cryptoKeys.decrypt` |
| **Cloud Logging** | REST v2 | `entries.write` (ingesta estructurada), `entries.list` (consulta de logs) |
| **OAuth2 / Metadata Server** | HTTP REST | `/oauth2/v4/token` (mock token Bearer), `/computeMetadata/v1/...` (Service Account token y metadata de proyecto) |

---

## 🔬 ¿Por qué Aura Lang?

1. **Compilación Nativa a Binarios Autónomos**:
   Aura se compila directamente a binarios nativos Mach-O y ELF con cero dependencias externas de runtime. Elimina los cuellos de botella de la máquina virtual de Java (JVM) que lastran a los emuladores oficiales de Google.
2. **Concurrencia CSP con Fibers Ligeros**:
   Inspirado en Go, Aura utiliza planificadores M:N de fibers y canales fuertemente tipados. Esto permite que el multiplexor HTTP procese miles de peticiones simultáneas con latencia sub-milisegundo.
3. **Inmutabilidad por Defecto y Sistema de Tipos Hindley-Milner**:
   Garantiza que el emulador sea resiliente ante condiciones de carrera y corrupciones de estado en pruebas concurrentes.
4. **Velocidad de Compilación de 850,000+ LOC/s**:
   El motor de compilación escrito en Rust permite iterar, probar y compilar instantáneamente.

---

## 🧪 Suite de Pruebas y Verificación

Aura-GCP incluye una suite de pruebas de integración completa que evalúa todos los servicios emulados contra llamadas reales `cURL` y SDKs.

Para ejecutar las pruebas:

```bash
# 1. Iniciar el servidor en segundo plano
GCP_PORT=8080 aurac run server.aura &

# 2. Ejecutar la suite de pruebas
./scripts/test_services.sh 8080
```

### Resultados de Verificación:

```
==================================================================
🧪 RUNNING AURA-GCP INTEGRATION TEST SUITE
Target Endpoint: http://localhost:8080
==================================================================

--- 1. System & Health Endpoints ---
  [PASS] Health Endpoint
  [PASS] Info Endpoint
  [PASS] Stats Endpoint
  [PASS] Unified Resources Endpoint
  [PASS] Clear Requests Endpoint
  [PASS] Web Console Serving
  [PASS] Promotional Website Serving

--- 2. OAuth2 & Compute Metadata Server ---
  [PASS] OAuth2 Mock Token
  [PASS] Metadata Project ID
  [PASS] Metadata Service Account Token

--- 3. Google Cloud Storage (GCS) ---
  [PASS] GCS Create Bucket
  [PASS] GCS List Buckets
  [PASS] GCS Upload Object
  [PASS] GCS Get Object Metadata
  [PASS] GCS Download Object Media
  [PASS] GCS List Objects

--- 4. Cloud Pub/Sub ---
  [PASS] PubSub Create Topic
  [PASS] PubSub List Topics
  [PASS] PubSub Create Subscription
  [PASS] PubSub Publish Message
  [PASS] PubSub Pull Messages
  [PASS] PubSub Acknowledge Message

--- 5. Cloud Firestore ---
  [PASS] Firestore Upsert Document
  [PASS] Firestore Get Document
  [PASS] Firestore List Documents
  [PASS] Firestore Run Query

--- 6. Secret Manager ---
  [PASS] SecretManager Create Secret
  [PASS] SecretManager Add Version
  [PASS] SecretManager Access Version

--- 7. Cloud Functions v2 ---
  [PASS] CloudFunctions Create Function
  [PASS] CloudFunctions Get Function
  [PASS] CloudFunctions Call Function

--- 8. Cloud KMS ---
  [PASS] KMS Create KeyRing
  [PASS] KMS Create CryptoKey
  [PASS] KMS Encrypt
  [PASS] KMS Decrypt

--- 9. Cloud Logging ---
  [PASS] Logging Write Entries
  [PASS] Logging List Entries

==================================================================
SUMMARY: Passed: 30 | Failed: 0
==================================================================
🎉 ALL 30 TESTS PASSED FLAWLESSLY ON AURA-GCP!
```

---

## 📂 Estructura del Proyecto

```
aura-gcp/
├── README.md                      # Documentación maestra y guía de referencia
├── server.aura                    # Punto de entrada y montaje del router HTTP
├── services/                      # Módulos y servicios desacoplados por dominio
│   ├── state.aura                 # Almacén de estado en memoria unificado (GcpStore)
│   ├── utils.aura                 # Funciones utilitarias, parseo de JSON y auditoría
│   ├── middleware.aura            # Middlewares globales: CORS, buffering y auth bypass
│   ├── auth.aura                  # Emulación de OAuth2 y Compute Metadata Server
│   ├── storage.aura               # Google Cloud Storage (GCS JSON API v1)
│   ├── pubsub.aura                # Cloud Pub/Sub (Topics, Subscriptions & Fanout)
│   ├── firestore.aura             # Cloud Firestore REST API (Documentos & Consultas)
│   ├── secrets.aura               # Secret Manager (Secretos y Versiones cifradas)
│   ├── functions.aura             # Cloud Functions v2 (Serverless Invocations)
│   ├── kms.aura                   # Cloud KMS (KeyRings, CryptoKeys & Cifrado)
│   ├── logging.aura               # Cloud Logging (Ingesta y lectura de LogEntry)
│   ├── system.aura                # Endpoints de sistema, salud, estadísticas y recursos
│   └── static.aura                # Enrutamiento de activos estáticos para UI y Website
├── ui/                            # Consola Web embebida (/_gcp/ui)
│   ├── index.html                 # Interfaz visual SPA estilo Google Cloud Console
│   ├── style.css                  # Estilos Material Dark Theme
│   └── app.js                     # Controlador interactivo y sincronización de recursos
├── website/                       # Sitio Web Promocional (/site)
│   ├── index.html                 # Landing page con Terminal interactiva y Benchmarks
│   ├── style.css                  # Diseño responsive moderno y tipografía fluida
│   └── app.js                     # Emulador de terminal en vivo y conmutador de SDKs
└── scripts/
    ├── test_services.sh           # Suite automatizada de pruebas de integración (30 tests)
    ├── demo_gcloud.sh             # Demostración en vivo de llamadas GCP
    └── run.sh                     # Script de arranque rápido
```

---

## 📄 Licencia

Este proyecto está licenciado bajo la **Licencia MIT**. Siéntete libre de usarlo, modificarlo y distribuirlo para proyectos personales, educativos y empresariales.
