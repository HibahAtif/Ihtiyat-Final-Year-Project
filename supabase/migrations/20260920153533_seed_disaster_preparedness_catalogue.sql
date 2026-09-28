begin;


/* -------------------------------------------------------------------------
 * 1. REUSABLE HAZARD CATALOGUE
 * -------------------------------------------------------------------------
 *
 * These records define Ihtiyat's V1 implementation scope.
 *
 * classification describes the application's implementation depth:
 *
 * - core:
 *   fully participates in preparedness missions, quiz learning,
 *   location relevance and later action-plan logic.
 *
 * - supported_regional:
 *   supported as a reusable regional preparedness hazard, but with
 *   deliberately lighter V1 implementation.
 *
 * - resource_supported:
 *   represented in the wider safety/resource catalogue without receiving
 *   the full V1 preparedness-scoring and quiz workflow.
 *
 * These classifications are application scope categories. They are not
 * scientific hazard-risk rankings, alert severity levels or probabilities.
 */

insert into public.hazards (
	code,
	name_en,
	name_ar,
	classification,
	sort_order,
	is_active
)
values
	(
		'heavy_rain_flash_flooding',
		'Heavy Rain / Flash Flooding',
		'الأمطار الغزيرة والسيول',
		'core',
		10,
		true
	),
	(
		'extreme_heat_heatwave',
		'Extreme Heat / Heatwave',
		'الحر الشديد وموجات الحر',
		'core',
		20,
		true
	),
	(
		'dust_sandstorm',
		'Dust / Sandstorm',
		'الغبار والعواصف الرملية',
		'core',
		30,
		true
	),
	(
		'earthquake',
		'Earthquake',
		'الزلازل',
		'core',
		40,
		true
	),
	(
		'landslide_rockfall',
		'Landslide / Rockfall',
		'الانهيارات الأرضية وتساقط الصخور',
		'supported_regional',
		50,
		true
	),
	(
		'cold_wave',
		'Cold Wave',
		'موجات البرد',
		'resource_supported',
		60,
		true
	),
	(
		'thunderstorm_lightning_strong_winds',
		'Thunderstorm / Lightning / Strong Winds',
		'العواصف الرعدية والبرق والرياح الشديدة',
		'resource_supported',
		70,
		true
	),
	(
		'drought_water_scarcity',
		'Drought / Water Scarcity',
		'الجفاف وشح المياه',
		'resource_supported',
		80,
		true
	),
	(
		'wildfire_vegetation_fire',
		'Wildfire / Vegetation Fire',
		'حرائق الغابات والغطاء النباتي',
		'resource_supported',
		90,
		true
	);


/* -------------------------------------------------------------------------
 * 2. PREPAREDNESS MISSION DEFINITIONS
 * -------------------------------------------------------------------------
 *
 * Ihtiyat deliberately uses a small set of reusable missions instead of
 * creating a separate mission for every hazard.
 *
 * The first two missions are national preparedness activities.
 * The third is adaptive and will later resolve hazard-linked content according
 * to the user's selected location.
 */

insert into public.preparedness_missions (
	code,
	title_en,
	title_ar,
	description_en,
	description_ar,
	mission_scope,
	sort_order,
	is_active
)
values
	(
		'household_emergency_kit',
		'Household Emergency Kit',
		'حقيبة الطوارئ المنزلية',
		'Prepare and maintain essential household supplies for emergencies.',
		'جهّز وحافظ على المستلزمات المنزلية الأساسية لحالات الطوارئ.',
		'national',
		10,
		true
	),
	(
		'household_communication_readiness',
		'Household & Communication Readiness',
		'الاستعداد الأسري والتواصل',
		'Prepare household contact arrangements, communication methods and backup plans for service disruption.',
		'جهّز ترتيبات التواصل الأسري ووسائل الاتصال والخطط البديلة عند تعطل الخدمات.',
		'national',
		20,
		true
	),
	(
		'know_your_local_hazards',
		'Getting to Know Your Local Hazards',
        'التعرف على المخاطر المحلية في منطقتك',
		'Learn about hazards relevant to your selected location and practise how to respond to them.',
		'تعرّف على المخاطر المرتبطة بموقعك المحدد وتدرّب على كيفية الاستجابة لها.',
		'adaptive',
		30,
		true
	);


commit;