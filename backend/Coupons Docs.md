
          
**Done**
- Implemented the coupon feature end-to-end:
  - DB schema
  - admin coupon management
  - customer coupon availability check
  - transactional coupon usage during customer order placement
  - discount-aware order/stat handling
  - unit tests

**Schema**
- Added [0012_create_coupons_tables.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/migrations/0012_create_coupons_tables.js)
  - `coupons`
    - `id`
    - `code` unique
    - `discount_percentage`
    - `number_of_people`
    - `used_count`
    - timestamps
  - `coupon_usages`
    - `customer_id`
    - `coupon_id`
    - `order_id`
    - timestamps
  - added order fields:
    - `coupon_id`
    - `discount_percentage`
    - `discount_amount`
- Added indexes for usage lookups and order coupon joins.

**Bloom Filter Plan Implemented**
- Added [BloomFilter.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/utils/BloomFilter.js)
- Added [couponAvailabilityService.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/services/couponAvailabilityService.js)
  - startup cache warm-up from DB
  - in-memory map of currently available coupons
  - bloom filter for fast negative checks
  - write-through sync after create/update/use
- Hooked cache initialization into [server.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/server.js)

**Admin Management**
- Added:
  - [couponRepository.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/data/couponRepository.js)
  - [couponService.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/services/couponService.js)
  - [couponController.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/controllers/couponController.js)
  - [couponRoutes.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/routes/couponRoutes.js)
- Mounted routes in [index.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/routes/index.js)
- Admin endpoints:
  - `POST /api/coupons`
  - `GET /api/coupons`
  - `GET /api/coupons/:id`
  - `PUT /api/coupons/:id`

**Customer Availability Endpoint**
- Added:
  - `GET /api/coupons/check?code=...`
- Uses bloom-filter-backed availability check first.
- Also verifies customer-specific re-use, so if the customer already used the coupon it returns unavailable.

**Order Flow**
- Updated [orderService.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/services/orderService.js)
  - accepts optional `coupon_code`
  - coupons are allowed only for customer-created orders
  - fast precheck via coupon availability service
  - authoritative DB validation inside transaction:
    - lock coupon row
    - fail if exhausted
    - fail if same customer already used it
    - compute `discount_amount`
    - persist `coupon_id`, `discount_percentage`, `discount_amount`
    - insert pivot record into `coupon_usages`
    - increment `used_count`
- Updated [orderController.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/controllers/orderController.js)
  - syncs coupon cache after successful use
- Updated [orderRepository.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/data/orderRepository.js)
  - persists and reads coupon/discount fields in list/detail/customer-order queries

**Race Condition Handling**
- Coupon use is protected by the order transaction:
  - `SELECT ... FOR UPDATE` on the coupon row
  - unique customer-coupon usage constraint in pivot table
  - same transaction for order creation, usage insert, and `used_count` increment
- This prevents two concurrent orders from consuming the same last available coupon.

**Stats**
- Updated [statsRepository.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/data/statsRepository.js)
  - order stats now expose coupon-related fields
  - customer spend paths continue to rely on `total_sold_price`, which now reflects discounted totals correctly

**Support Changes**
- Updated [productRepository.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/src/data/productRepository.js)
  - quantity increase/decrease now accept transaction clients
- Updated test reset/setup:
  - [dbUtils.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/test/utils/dbUtils.js)
  - [setupAfterEnv.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/test/setupAfterEnv.js)
- Added direct coupon test helpers in `dbUtils`.

**Tests**
- Added [couponUnitTests.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/test/unitTest/couponUnitTests.js)
  - admin create/list/get/update
  - customer availability check
  - unavailable-after-use behavior
- Updated [orderUnitTests.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/test/unitTest/orderUnitTests.js)
  - valid coupon use
  - already-used coupon
  - exhausted coupon
- Added [statsCouponUnitTests.js](file:///e:/my-stuff/Projects1/Dev-Hub%20Projects/role-based-marketing-app/backend/test/unitTest/statsCouponUnitTests.js)
  - verifies customer spend uses discounted totals

**Verification**
- Ran focused coupon/order/stats tests
- Ran full `npm test`
- Full suite passes

**Notes**
- The bloom filter here is used as a fast availability hint to reduce unnecessary DB hits.
- Final truth still comes from the transactional DB check, which is the correct place to enforce correctness and concurrency safety.