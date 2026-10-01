# Aura-GCP (Aura Lang)
 Ha realizado un análisis exhaustivo del proyecto **Aura-AWS**, su arquitectura de código, modelo de concurrencia, diseño de protocolos e implementación en Aura Lang.
  A continuación se presenta el diagnóstico detallado del sistema actual y la evaluación técnica de factibilidad para construir una versión equivalente para Google Cloud Platform
  (GCP).
  ──────
   1. Análisis del Proyecto Aura-AWS y su Implementación

  ### 🎯 Propósito y Filosofía

  Aura-AWS es un emulador de nube local autónomo (actualmente para el ecosistema AWS, drop-in replacement de herramientas como LocalStack y emuladores Java). Su objetivo fundamental
  es proveer un entorno de desarrollo y pruebas locales sin cuentas de nube, sin tokens de autenticación obligatorios, sin telemetría y con rendimiento nativo extremo.
  
  ### 🏛️ Arquitectura del Sistema
  │ Diagram exceeds terminal width (454 > 181 cols)
  │ Displayed as code block. Widen terminal to view inline.

    flowchart TD
        Client["Clientes AWS\n(AWS CLI · Boto3 · SDK v3 · Terraform)"]

        subgraph AuraAWS ["Aura-AWS Engine (:4566)"]
            Mux["Aura ServeMux HTTP\nFibers CSP M:N"]
            Middleware["Middleware Global\n(CORS + Body Buffering)"]

            Classifier{"Clasificador de Protocolos\nx-amz-target / Action / Path"}

            subgraph Services ["Servicios Emulados"]
                S3["Amazon S3\nREST-XML"]
                Dynamo["Amazon DynamoDB\nJSON 1.0"]
                SQS["Amazon SQS\nQuery & JSON"]
                SNS["Amazon SNS\nPub/Sub & Fanout"]
                Lambda["AWS Lambda\nREST API"]
                SecKms["Secrets, SSM & KMS\nJSON 1.1"]
                LogsEv["CloudWatch & EventBridge\nJSON 1.1"]
                STS_IAM["STS & IAM\nQuery Protocol"]
            end

            Store[("In-Memory CloudStore\nEstado Centralizado")]
            UI["Consola Web SPA\n(/_aws/ui & /site)"]
        end

        Client -->|HTTP :4566| Mux
        Mux --> Middleware --> Classifier
        Classifier --> Services
        Services <--> Store
        Mux --> UI

  ### 🔍 Componentes Clave de la Implementación

  1. Punto de Entrada (server.aura):
      • Configura el multiplexor HTTP (http.newServeMux()) en el puerto 4566 (estándar de LocalStack).
      • Inicia los servicios con un cold-start empírico de ~1.8 ms y un uso de memoria de ~8.4 MB.
  2. Despachador de Protocolo AWS (dispatcher.aura):
      • AWS concentra casi todas sus llamadas en POST /. El despachador inspecciona las cabeceras x-amz-target (ej. DynamoDB_20120810.CreateTable, TrentService.CreateKey,
      AmazonSQS.ReceiveMessage) y parámetros Action para enrutar internamente la petición al servicio correcto.
  3. Almacén de Estado en Memoria (state.aura):
      • Unifica en la estructura CloudStore los recursos (Buckets, Tablas, Colas, Funciones, Secretos, etc.), permitiendo reseteos instantáneos (/_aws/reset) y telemetría en tiempo real.
  4. Servicios REST Específicos:
      • s3.aura: Maneja rutas directas con comodines (PUT /:bucket, GET /:bucket/:key, Multipart uploads) y serialización XML con xml.aura.
      • lambda.aura: Provee las APIs REST de /2015-03-31/functions con ejecución simulada y registro de logs.
  5. Observabilidad y Consola Web Embebida (ui/ y website/):
      • Sirve una interfaz SPA en /_aws/ui con inspección visual de recursos y auditoría de peticiones en vivo.

  ──────
   2. Factibilidad de una Versión para Google Cloud Platform (GCP)

  │ Important
  │ Veredicto: Es 100% posible y técnicamente muy viable. De hecho, implementar un emulador para GCP en Aura Lang es más limpio y arquitectónicamente más ordenado que para AWS,
  │ debido a la estandarización del diseño de APIs de Google.

  ### ¿Por qué existe una gran oportunidad con GCP?

  1. Ausencia de un "LocalStack" consolidado para GCP:
      • En AWS existen LocalStack, Moto y Aura.
      • En GCP, los desarrolladores dependen de los emuladores fragmentados del SDK oficial (gcloud beta emulators pubsub, firestore, datastore, bigtable), cada uno corriendo en
      procesos Java/Go separados, en puertos distintos (8085, 8080, 8086), consumiendo más de 400 MB de RAM y sin consola web unificada.
  2. Estandarización REST / JSON (Google API Design Guide):
      • AWS sufre de fragmentación histórica: protocolos Query/XML, JSON 1.0, JSON 1.1 y REST-XML.
      • GCP utiliza URLs semánticas y JSON estándar en prácticamente todas sus APIs (/v1/projects/{project}/...), lo que elimina la necesidad de clasificadores complejos por
      cabeceras (x-amz-target).
  3. Mismo motor de alto rendimiento:
      • Utilizando Aura Lang con compilación nativa Cranelift y CSP Fibers, el emulador de GCP mantendría los mismos beneficios: arranque en < 2 ms, consumo de < 10 MB RAM y cero
      dependencias de Docker o Java.

  ──────
   3. Mapeo de Servicios: AWS (Aura-AWS) vs. GCP

   Categoría                   | Servicio AWS (Aura-Aur… | Servicio GCP Equivalente          | Protocolo Wire en GCP     | Rutas Canónicas a Emular
  -----------------------------|--------------------------|-----------------------------------|---------------------------|--------------------------------------------------------
   Almacenamiento de Objetos   | Amazon S3                | Cloud Storage (GCS)               | REST / JSON v1 (+ XML     | /storage/v1/b (buckets)/storage/v1/b/{b}/o
                               |                          |                                   | API)                      | (objects)/upload/storage/v1/b/{b}/o
   Base de Datos NoSQL         | Amazon DynamoDB          | Cloud Firestore / Datastore       | REST v1 / JSON            | /v1/projects/{p}/databases/(default)/documents
   Colas de Mensajes           | Amazon SQS               | Cloud Pub/Sub (Subscriptions)     | REST v1 / JSON            | /v1/projects/{p}/subscriptions (pull, ack)
   Publicación / Suscripción   | Amazon SNS               | Cloud Pub/Sub (Topics)            | REST v1 / JSON            | /v1/projects/{p}/topics (publish)
   Computación Serverless      | AWS Lambda               | Cloud Functions / Cloud Run       | REST v2 / JSON            | /v2/projects/{p}/locations/{l}/functions
   Gestión de Secretos         | AWS Secrets Manager      | Secret Manager                    | REST v1 / JSON            | /v1/projects/{p}/secrets/v1/projects/{p}/secrets/{s}/v
                               |                          |                                   |                           | ersions
   Parámetros de Configuración | AWS SSM Parameter Store  | Cloud Runtime Config / Secret Mgr | REST v1 / JSON            | /v1/projects/{p}/configs
   Criptografía y Llaves       | AWS KMS                  | Cloud KMS                         | REST v1 / JSON            | /v1/projects/{p}/locations/{l}/keyRings/.../cryptoKeys
   Logs Estructurados          | CloudWatch Logs          | Cloud Logging                     | REST v2 / JSON            | /v2/entries:write, /v2/entries:list
   Eventos y Enrutamiento      | Amazon EventBridge       | Eventarc / Cloud Tasks            | REST v1 / JSON            | /v1/projects/{p}/locations/{l}/triggers
   Autenticación e Identidad   | AWS STS / IAM            | OAuth2 & Metadata Server          | HTTP REST                 | /oauth2/v4/tokenhttp://metadata.google.internal/...
  ──────
   4. Compatibilidad con el Ecosistema de Clientes de GCP

  Los SDKs, CLIs y herramientas de infraestructura de Google Cloud están preparados de forma nativa para conectarse a endpoints locales:

  ### 1. Variables de Entorno Universales (SDKs de Python, Node, Go, Java)

  Google Cloud soporta de forma estándar variables que los SDKs leen automáticamente:

    export STORAGE_EMULATOR_HOST=http://localhost:8080
    export PUBSUB_EMULATOR_HOST=localhost:8080
    export FIRESTORE_EMULATOR_HOST=localhost:8080

  ### 2. HashiCorp Terraform / OpenTofu (provider "google")

  El proveedor de Terraform de Google permite sobreescribir los endpoints base directamente a nuestro emulador:

    provider "google" {
      project                     = "local-gcp-project"
      storage_custom_endpoint     = "http://localhost:8080/storage/v1/"
      pubsub_custom_endpoint      = "http://localhost:8080/v1/"
      secret_manager_custom_endpoint = "http://localhost:8080/v1/"
      cloud_functions_custom_endpoint = "http://localhost:8080/v2/"
      skip_credentials_validation = true
    }

    resource "google_storage_bucket" "local_bucket" {
      name     = "datos-locales"
      location = "US"
    }

  ### 3. Google Cloud CLI (gcloud)

    gcloud config set api_endpoint_overrides/storage http://localhost:8080/storage/v1/
    gcloud config set api_endpoint_overrides/pubsub http://localhost:8080/v1/

  ### 4. SDK de Python (google-cloud-storage & google-cloud-pubsub)

    from google.cloud import storage, pubsub_v1

    # Cloud Storage local
    gcs_client = storage.Client(
        client_options={"api_endpoint": "http://localhost:8080"}
    )
    bucket = gcs_client.create_bucket("mi-bucket-local")

    # Cloud Pub/Sub local
    publisher = pubsub_v1.PublisherClient(
        client_options={"api_endpoint": "localhost:8080"}
    )
    topic_path = publisher.topic_path("local-project", "eventos-facturacion")
    publisher.create_topic(request={"name": topic_path})
  ──────
   5. Propuesta de Arquitectura para el Emulador GCP ("Aura-GCP")

  Siguiendo el diseño modular y desacoplado ya validado en Aura-AWS:

    aura-gcp/
    ├── server.aura                 # ServeMux central (puerto 8080 o configurable)
    ├── services/
    │   ├── state.aura              # CloudStore GCP (Buckets, Topics, Subscriptions, Firestore docs, etc.)
    │   ├── middleware.aura         # CORS universal, body buffering y auth bypass
    │   ├── auth.aura               # Emulación de OAuth2 Token (/token) y Compute Metadata Server
    │   ├── storage.aura            # Google Cloud Storage (JSON API v1 & XML fallback)
    │   ├── pubsub.aura             # Cloud Pub/Sub (Topics, Subscriptions, Publish, Pull & Push fanout)
    │   ├── firestore.aura          # Cloud Firestore (Documentos, Colecciones, Consultas y CRUD)
    │   ├── functions.aura          # Cloud Functions v2 (Registro, configuración e invocación)
    │   ├── secrets.aura            # Secret Manager (Secretos, Versiones y Cargas útiles)
    │   ├── kms.aura                # Cloud KMS (KeyRings, CryptoKeys, Encrypt/Decrypt)
    │   ├── logging.aura            # Cloud Logging (Ingesta de LogEntries y lectura)
    │   ├── system.aura             # Endpoints /_gcp/health, stats y recursos unificados
    │   └── static.aura             # Servidor de UI web local
    ├── ui/                         # Consola Web (Estilo Google Cloud Console)
    │   ├── index.html              # Dashboard, Storage Browser, PubSub Viewer, Firestore Explorer
    │   ├── style.css               # Tema oscuro / Material Cloud UI
    │   └── app.js                  # Sincronización en vivo de recursos y telemetría
    └── scripts/
        ├── test_services.sh        # Suite de pruebas automatizadas (cURL / gcloud)
        ├── demo_gcloud.sh          # Demostración interactiva
        └── run.sh                  # Lanzador rápido
  ──────
   6. Estrategia de Implementación Recomendada

  Si deseas proceder con la creación de esta versión para Google Cloud Platform, se recomienda un plan en 3 fases:

  1. Fase 1: Núcleo y Servicios Esenciales (Storage + Pub/Sub + Auth)
      • Servidor base en Aura Lang y emulación de metadata/token (/oauth2/v4/token).
      • Implementación de Google Cloud Storage (crear buckets, subir/bajar objetos).
      • Implementación de Cloud Pub/Sub (crear tópicos, suscripciones y publicar mensajes).
  2. Fase 2: Datos y Computación (Firestore + Secret Manager + Cloud Functions)
      • API REST de Cloud Firestore (creación y lectura de documentos).
      • Servicio Secret Manager (gestión de secretos y versiones).
      • Cloud Functions (registro e invocación HTTP).
  3. Fase 3: Observabilidad, Consola Web y Suite de Pruebas
      • Cloud Logging y Cloud KMS.
      • Consola Web GCP: Visualizador de recursos y panel de métricas en tiempo real.
      • Script automatizado de pruebas test_services.sh validando llamadas REST con cURL y SDKs de GCP.

  ──────
  ¿Deseas que preparemos un prototipo inicial o plan detallado de implementación para comenzar el desarrollo de Aura-GCP en este u otro repositorio?
