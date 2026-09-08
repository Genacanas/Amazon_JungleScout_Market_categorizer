# Market Categorizer App

Esta carpeta contiene la aplicación Cloud (Web) que reemplaza la antigua categorización automática por IA (Fase 3 y 4 del pipeline original) por una **Herramienta de Categorización Manual** para el cliente.

## Arquitectura

La aplicación se divide en dos partes principales (que se implementarán aquí):

1.  **Frontend (Next.js):** Interfaz web donde el cliente puede visualizar el catálogo de productos extraídos, crear etiquetas personalizadas, asignar productos a esas etiquetas como un juego, y generar el reporte final interactivo.
2.  **Backend (FastAPI):** API en Python que gestiona la conexión con la base de datos, recibe los datos crudos desde el scraper local, guarda el progreso de categorización, y ejecuta la lógica de las Fases 5 y 6 (Análisis de Mercado con OpenAI y generación del Dashboard HTML).

## Base de Datos

Todo el estado y almacenamiento se centraliza en **Neon (PostgreSQL)**, operando de manera serverless:
*   Almacena los productos, metadatos, y URLs de imágenes.
*   Guarda el progreso de las categorizaciones manuales.
*   Almacena el código HTML final generado del Dashboard para su visualización web.

## Flujo de Trabajo

1.  El scraping (Fases 0, 1 y 2) se ejecuta de forma **local** en la carpeta raíz `market_intelligence_pipeline`.
2.  Los resultados locales se suben a esta aplicación Cloud usando un script de sincronización.
3.  El cliente clasifica los productos a través de la Web.
4.  El cliente presiona "Generar Reporte" y la app ejecuta la magia final.
