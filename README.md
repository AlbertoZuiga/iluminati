# Iluminati

Iluminati es una aplicación web para gestionar el uso de autos compartidos entre un grupo de personas (por ejemplo, familia o hermanos).

Permite registrar viajes, gastos y kilómetros recorridos de forma simple, con el objetivo de automatizar el cálculo de costos y deudas entre los participantes.

---

## 🚗 ¿Qué permite hacer?

- Registrar viajes con kilometraje inicial y final
- Asociar usuarios a cada viaje (quiénes usaron el auto)
- Registrar gastos del vehículo (bencina, peajes, mantenciones, etc.)
- Distribuir costos entre los participantes
- Llevar historial por auto y por fecha
- Calcular saldos entre usuarios de forma justa

---

## 🎯 Objetivo

El objetivo de Iluminati es reemplazar el registro manual en hojas de cálculo y simplificar la administración de autos compartidos, asegurando que cada persona pague proporcionalmente según el uso real del vehículo.

---

## 🧱 Arquitectura del proyecto

Frontend:

- React + Vite

> En desarrollo, el frontend consume la API por `/api` usando proxy de Vite.
> `VITE_API_URL` sigue apuntando al Web App de Google Apps Script.

Backend (simple):

- Google Apps Script

Base de datos:

- Google Sheets

Almacenamiento de archivos:

- Google Drive (opcional)

---

## 📊 Modelo de datos (Google Sheets)

Se utilizan varias hojas:

### Usuarios

- id
- nombre

### Autos

- id
- nombre
- patente
- marca
- modelo
- año

### Viajes

- id
- auto
- fecha
- km_inicio
- km_fin

### Gastos

- id
- auto
- fecha
- tipo
- monto
- pagado_por

### Participantes

- relación entre viajes/gastos y usuarios

---

## 🧠 Concepto clave

La aplicación se basa en dos ideas principales:

- Viajes: registran el uso del auto (kilómetros recorridos)
- Gastos: registran los costos asociados al auto

Ambos se distribuyen entre usuarios para calcular el saldo final de cada persona.
