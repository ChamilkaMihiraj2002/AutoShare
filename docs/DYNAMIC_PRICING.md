# Dynamic Price Calculation

This document explains how AutoShare calculates the live dynamic vehicle price and the final total shown on the booking page.

## Overview

Dynamic pricing is calculated on the backend in [Server/app/services/vehicle_pricing.py](Server/app/services/vehicle_pricing.py).

The booking page requests a live quote from:

- `GET /vehicles/{vehicle_id}/pricing`

The frontend calls this endpoint from:

- [Client/src/lib/api.ts](Client/src/lib/api.ts)
- [Client/src/pages/VehicleBooking.tsx](Client/src/pages/VehicleBooking.tsx)

## Where the Base Price Comes From

Each vehicle has a normal daily price stored as:

- `vehicle.price`

Inside the pricing service, that becomes:

```python
base_daily_price = round(float(vehicle.get("price", 0) or 0), 2)
```

This is the starting price for every booking day.

## How Dynamic Price Is Calculated

For a booking, the backend:

1. Validates `start_date` and `end_date`
2. Creates a list of booking days
3. Starts each day with the vehicle's base daily price
4. Applies dynamic multipliers for that day
5. Sums all adjusted daily prices into a subtotal
6. Applies duration discounts
7. Adds a distance fee if applicable
8. Returns the final pricing quote

## Dynamic Pricing Rules

The pricing rules come from the dynamic pricing settings schema:

- `enabled`
- `weekend_multiplier`
- `weekly_discount_percentage`
- `monthly_discount_percentage`
- `holiday_multiplier`
- `rainy_weather_multiplier`
- `severe_weather_multiplier`
- `distance_included_km`
- `distance_surcharge_per_km`
- `custom_date_multipliers`

These fields are defined in:

- [Server/app/schemas/vehicles_schema.py](Server/app/schemas/vehicles_schema.py)

## Per-Day Adjustment Logic

For each booking day, the backend starts with:

```python
adjusted_price = base_daily_price
```

Then it may apply the following multipliers.

### 1. Weekend Multiplier

If the day is Saturday or Sunday and dynamic pricing is enabled:

```python
adjusted_price *= weekend_multiplier
```

Example:

- Base price = `8500`
- Weekend multiplier = `1.10`
- Adjusted day price = `9350`

### 2. Holiday Multiplier

If the booking day is a public holiday:

```python
adjusted_price *= holiday_multiplier
```

### 3. Weather Multiplier

If weather data shows special conditions:

- Rain uses `rainy_weather_multiplier`
- Severe weather uses `severe_weather_multiplier`

Example:

```python
adjusted_price *= rainy_weather_multiplier
```

### 4. Custom Date Multiplier

If the booking day falls inside a configured custom date range:

```python
adjusted_price *= multiplier
```

This is useful for periods like:

- New Year demand
- Festival season
- School holidays
- Long weekends

## Subtotal Calculation

After adjusting each day, the backend adds the adjusted day price to the subtotal:

```python
subtotal += adjusted_price
```

So:

- `subtotal` = sum of all dynamically adjusted daily prices

## Duration Discount Calculation

After subtotal is calculated, the system checks trip length:

- If total days is `>= 30`, use `monthly_discount_percentage`
- Else if total days is `>= 7`, use `weekly_discount_percentage`
- Else no duration discount

Discount amount:

```python
duration_discount_amount = subtotal * (duration_discount_percentage / 100)
```

## Distance Fee Calculation

The backend also calculates route distance using pickup and destination coordinates.

If dynamic pricing is enabled:

1. It finds total road distance in kilometers
2. Subtracts the included free distance
3. Charges extra for the remaining kilometers

Formula:

```python
extra_distance_km = max(0.0, distance_km - distance_included_km)
distance_fee = extra_distance_km * distance_surcharge_per_km
```

If dynamic pricing is disabled, the distance fee is `0`.

## Final Dynamic Quote Total

The backend final quote total is:

```python
total = subtotal - duration_discount_amount + distance_fee
```

So the backend quote includes:

- adjusted daily pricing
- duration discount
- distance fee

The backend returns a pricing quote with fields like:

- `base_daily_price`
- `total_days`
- `subtotal`
- `duration_discount_percentage`
- `duration_discount_amount`
- `distance_km`
- `distance_fee`
- `holiday_dates`
- `weather_summary`
- `total`
- `line_items`

## Final Booking Page Total

The booking page adds some extra frontend charges on top of the backend pricing quote.

In [Client/src/pages/VehicleBooking.tsx](Client/src/pages/VehicleBooking.tsx), the final total is calculated as:

```ts
total = vehicleSubtotal + distanceFee + serviceFee + insuranceTotal + deliveryFee + childSeatTotal;
```

### Booking Page Variables

`vehicleSubtotal`

- If a live quote exists:

```ts
pricingQuote.subtotal - pricingQuote.duration_discount_amount
```

- Otherwise:

```ts
vehicle.price * duration
```

`distanceFee`

- Comes from backend:

```ts
pricingQuote?.distance_fee ?? 0
```

`serviceFee`

- Hardcoded as:

```ts
const serviceFee = 9;
```

`insuranceTotal`

- Based on selected insurance plan and number of days

Rules:

- `basic` = `0` per day
- `standard` = `1200` per day
- `premium` = `2500` per day

Formula:

```ts
insuranceTotal = insurancePerDay * duration
```

`deliveryFee`

- `1500` if delivery is selected
- `0` for self pickup

`childSeatTotal`

Formula:

```ts
childSeatTotal = childSeatCount * 500 * duration
```

## Total Calculation Summary

### Backend Dynamic Quote

```text
Daily adjusted prices
-> subtotal
-> subtract duration discount
-> add distance fee
-> backend quote total
```

Formula:

```text
backend_quote_total = subtotal - duration_discount_amount + distance_fee
```

### Frontend Booking Total

```text
backend vehicle amount
+ distance fee
+ service fee
+ insurance fee
+ delivery fee
+ child seat fee
= final amount shown to user
```

Formula:

```text
final_booking_total = vehicleSubtotal + distanceFee + serviceFee + insuranceTotal + deliveryFee + childSeatTotal
```

## Important Implementation Detail

The current pricing flow uses global admin dynamic pricing settings when generating the live quote and rent pricing snapshot.

That global configuration is loaded from:

- [Server/app/services/dynamic_pricing_settings.py](Server/app/services/dynamic_pricing_settings.py)

and used in:

- [Server/app/routers/general.py](Server/app/routers/general.py)
- [Server/app/routers/rents.py](Server/app/routers/rents.py)

This means the current live pricing flow is based on the global admin settings, even though the vehicle schema also supports a `dynamic_pricing` field.
