/*
 * Ihtiyat multi-hazard alert and emergency-action catalogue.
 *
 * WHAT:
 * Seeds the V1 simulated-alert catalogue, reusable bilingual emergency
 * actions and deterministic action-ranking rules.
 *
 * WHY:
 * The final application is Saudi Arabia-focused and multi-hazard. Jeddah
 * flash flooding remains the deepest implemented pilot, but the final alert
 * and action-plan architecture should not be hard-coded to one hazard.
 *
 * HOW:
 * Eight of the nine V1 hazards receive simulation/action-plan coverage:
 *
 * - heavy rain / flash flooding;
 * - extreme heat / heatwave;
 * - dust / sandstorm;
 * - earthquake;
 * - landslide / rockfall;
 * - cold wave;
 * - thunderstorm / lightning / strong winds;
 * - wildfire / vegetation fire.
 *
 * Drought / water scarcity remains preparedness and Resource Hub content in
 * V1 because it is a longitudinal resilience issue rather than an urgent
 * response scenario.
 *
 * IMPORTANT:
 * Every alert inserted here has origin_type = 'simulated'. These rows are
 * demonstration scenarios for Ihtiyat and are not presented as live
 * warnings issued by NCM, Saudi Civil Defense or another authority.
 *
 * Safety wording is derived from the same reviewed official-source material
 * already represented in Ihtiyat's Resource Hub catalogue.
*/

begin;


/* ==========================================================================
 * 1. CONTROLLED SIMULATED-ALERT MANIFEST
 * ========================================================================== 
*/


/*
 * The intentionally broad validity window keeps these deterministic
 * demonstration scenarios reproducible for project evaluation.
 *
 * They are not historical or forecast events. The UI must visibly identify
 * them as simulations.
*/
create temporary table seed_alert_catalogue (
	code text primary key,
	hazard_code text not null,
	origin_type text not null,
	severity smallint not null,
	title_en text not null,
	title_ar text not null,
	message_en text not null,
	message_ar text not null,
	starts_at timestamptz not null,
	published_at timestamptz not null,
	expires_at timestamptz not null,
	sort_order smallint not null
) on commit drop;


insert into seed_alert_catalogue (
	code,
	hazard_code,
	origin_type,
	severity,
	title_en,
	title_ar,
	message_en,
	message_ar,
	starts_at,
	published_at,
	expires_at,
	sort_order
)
values
	(
		'sim_flood_jeddah_severe',
		'heavy_rain_flash_flooding',
		'simulated',
		3,
		'[SIMULATION] Severe Heavy Rain & Flash Flooding — Jeddah',
		'[محاكاة] أمطار غزيرة وسيول شديدة — جدة',
		'Ihtiyat test scenario: severe heavy-rain and flash-flood conditions are being simulated for Jeddah. Avoid valleys, low areas and floodwater, and follow current official instructions. This is not an official warning.',
		'سيناريو اختباري من احتياط: تتم محاكاة حالة أمطار غزيرة وسيول شديدة في جدة. تجنب الأودية والمناطق المنخفضة ومياه السيول، واتبع التعليمات الرسمية الحالية. هذا ليس تحذيراً رسمياً.',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2099-12-31 23:59:59+00',
		10
	),
	(
		'sim_heat_eastern_severe',
		'extreme_heat_heatwave',
		'simulated',
		3,
		'[SIMULATION] Severe Extreme Heat — Eastern Region',
		'[محاكاة] موجة حر شديدة — المنطقة الشرقية',
		'Ihtiyat test scenario: severe extreme-heat conditions are being simulated for the Eastern Region. Reduce unnecessary heat exposure, maintain fluids and move to a cooler place when necessary. This is not an official warning.',
		'سيناريو اختباري من احتياط: تتم محاكاة حالة حر شديد في المنطقة الشرقية. قلّل التعرض غير الضروري للحرارة، واحرص على السوائل، وانتقل إلى مكان أبرد عند الحاجة. هذا ليس تحذيراً رسمياً.',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2099-12-31 23:59:59+00',
		20
	),
	(
		'sim_dust_riyadh_severe',
		'dust_sandstorm',
		'simulated',
		3,
		'[SIMULATION] Severe Dust & Sandstorm — Riyadh Region',
		'[محاكاة] غبار وعاصفة رملية شديدة — منطقة الرياض',
		'Ihtiyat test scenario: severe blowing-dust and sandstorm conditions are being simulated for Riyadh Region. Stay in a safe indoor place where possible and use extra caution if travel is unavoidable. This is not an official warning.',
		'سيناريو اختباري من احتياط: تتم محاكاة حالة غبار متطاير وعاصفة رملية شديدة في منطقة الرياض. ابقَ في مكان داخلي آمن متى أمكن وتوخَّ حذراً إضافياً إذا كان التنقل ضرورياً. هذا ليس تحذيراً رسمياً.',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2099-12-31 23:59:59+00',
		30
	),
	(
		'sim_earthquake_madinah_severe',
		'earthquake',
		'simulated',
		3,
		'[SIMULATION] Severe Earthquake Response Scenario — Madinah Region',
		'[محاكاة] سيناريو استجابة لزلزال شديد — منطقة المدينة المنورة',
		'Ihtiyat test scenario: a severe earthquake-response situation is being simulated for Madinah Region. Protect yourself from falling objects during shaking and follow official emergency information afterwards. This is not an earthquake prediction or official warning.',
		'سيناريو اختباري من احتياط: تتم محاكاة حالة استجابة لزلزال شديد في منطقة المدينة المنورة. احمِ نفسك من الأجسام الساقطة أثناء الاهتزاز واتبع معلومات الطوارئ الرسمية بعده. هذه ليست توقعاً لوقوع زلزال ولا تحذيراً رسمياً.',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2099-12-31 23:59:59+00',
		40
	),
	(
		'sim_rockfall_asir_severe',
		'landslide_rockfall',
		'simulated',
		3,
		'[SIMULATION] Severe Rockfall & Slope-Collapse Risk — Asir Region',
		'[محاكاة] خطر شديد لتساقط الصخور وانهيار المنحدرات — منطقة عسير',
		'Ihtiyat test scenario: severe rockfall and slope-collapse conditions are being simulated for Asir Region. Avoid known dangerous roads and slopes and keep a safe distance from any collapse area. This is not an official warning.',
		'سيناريو اختباري من احتياط: تتم محاكاة خطر شديد لتساقط الصخور وانهيار المنحدرات في منطقة عسير. تجنب الطرق والمنحدرات الخطرة وابقَ على مسافة آمنة من أي موقع انهيار. هذا ليس تحذيراً رسمياً.',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2099-12-31 23:59:59+00',
		50
	),
	(
		'sim_cold_wave_national_severe',
		'cold_wave',
		'simulated',
		3,
		'[SIMULATION] Severe Cold-Wave Scenario — Saudi Arabia',
		'[محاكاة] سيناريو موجة برد شديدة — المملكة العربية السعودية',
		'Ihtiyat test scenario: severe low-temperature conditions are being simulated nationally. Keep the home warm using safe heating practices and avoid unsafe indoor burning. This is not an official warning.',
		'سيناريو اختباري من احتياط: تتم محاكاة حالة انخفاض شديد في درجات الحرارة على المستوى الوطني. حافظ على دفء المنزل باستخدام وسائل تدفئة آمنة وتجنب إشعال النار بصورة غير آمنة داخل الأماكن المغلقة. هذا ليس تحذيراً رسمياً.',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2099-12-31 23:59:59+00',
		60
	),
	(
		'sim_thunderstorm_national_severe',
		'thunderstorm_lightning_strong_winds',
		'simulated',
		3,
		'[SIMULATION] Severe Thunderstorm & Lightning Scenario — Saudi Arabia',
		'[محاكاة] سيناريو عواصف رعدية وبرق شديد — المملكة العربية السعودية',
		'Ihtiyat test scenario: severe thunderstorm, lightning and strong-wind conditions are being simulated nationally. Seek suitable shelter and avoid exposed locations. This is not an official warning.',
		'سيناريو اختباري من احتياط: تتم محاكاة عواصف رعدية وبرق ورياح شديدة على المستوى الوطني. احتمِ في مكان مناسب وتجنب المواقع المكشوفة. هذا ليس تحذيراً رسمياً.',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2099-12-31 23:59:59+00',
		70
	),
	(
		'sim_wildfire_national_severe',
		'wildfire_vegetation_fire',
		'simulated',
		3,
		'[SIMULATION] Severe Vegetation-Fire Scenario — Saudi Arabia',
		'[محاكاة] سيناريو حريق غطاء نباتي شديد — المملكة العربية السعودية',
		'Ihtiyat test scenario: a severe vegetation-fire emergency is being simulated nationally. Keep away from the dangerous area and follow current official instructions. This is not an official warning.',
		'سيناريو اختباري من احتياط: تتم محاكاة حالة طوارئ شديدة لحريق في الغطاء النباتي على المستوى الوطني. ابتعد عن منطقة الخطر واتبع التعليمات الرسمية الحالية. هذا ليس تحذيراً رسمياً.',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2026-01-01 00:00:00+00',
		timestamptz '2099-12-31 23:59:59+00',
		80
	);


insert into public.alerts (
	code,
	hazard_id,
	origin_type,
	external_alert_id,
	severity,
	title_en,
	title_ar,
	message_en,
	message_ar,
	starts_at,
	published_at,
	expires_at,
	publication_status,
	sort_order
)
select
	seed.code,
	hazard.id,
	seed.origin_type,
	null,
	seed.severity,
	seed.title_en,
	seed.title_ar,
	seed.message_en,
	seed.message_ar,
	seed.starts_at,
	seed.published_at,
	seed.expires_at,
	'published',
	seed.sort_order
from seed_alert_catalogue as seed
join public.hazards as hazard
	on hazard.code = seed.hazard_code
order by seed.sort_order
on conflict (code)
do update
set
	hazard_id = excluded.hazard_id,
	origin_type = excluded.origin_type,
	external_alert_id = excluded.external_alert_id,
	severity = excluded.severity,
	title_en = excluded.title_en,
	title_ar = excluded.title_ar,
	message_en = excluded.message_en,
	message_ar = excluded.message_ar,
	starts_at = excluded.starts_at,
	published_at = excluded.published_at,
	expires_at = excluded.expires_at,
	publication_status = excluded.publication_status,
	sort_order = excluded.sort_order;


/* ==========================================================================
 * 2. LOCATION-SPECIFIC ALERT LINKS
 * ========================================================================== 
*/


create temporary table seed_alert_location_links (
	alert_code text primary key,
	location_official_code text not null
) on commit drop;


insert into seed_alert_location_links (
	alert_code,
	location_official_code
)
values
	('sim_flood_jeddah_severe', '0124'),
	('sim_heat_eastern_severe', '0005'),
	('sim_dust_riyadh_severe', '0001'),
	('sim_earthquake_madinah_severe', '0003'),
	('sim_rockfall_asir_severe', '0006');


/*
 * Remove only links belonging to this controlled seed manifest so rerunning
 * the seed SQL manually would not leave stale relationships behind.
 */
delete from public.alert_locations
where alert_id in (
	select alert.id
	from public.alerts as alert
	join seed_alert_catalogue as seed
		on seed.code = alert.code
);


insert into public.alert_locations (
	alert_id,
	location_id
)
select
	alert.id,
	location.id
from seed_alert_location_links as link
join public.alerts as alert
	on alert.code = link.alert_code
join public.locations as location
	on location.official_code = link.location_official_code
order by alert.sort_order;


/* ==========================================================================
 * 3. REUSABLE BILINGUAL SAFETY ACTIONS
 * ========================================================================== */


create temporary table seed_actions (
	code text primary key,
	title_en text not null,
	title_ar text not null,
	instruction_en text not null,
	instruction_ar text not null,
	sort_order smallint not null
) on commit drop;


insert into seed_actions (
	code,
	title_en,
	title_ar,
	instruction_en,
	instruction_ar,
	sort_order
)
values
	(
		'follow_official_directions',
		'Follow official directions',
		'اتبع التوجيهات الرسمية',
		'Follow current instructions, evacuation directions and safe routes issued by the competent Saudi authorities. If official guidance conflicts with Ihtiyat, follow the official guidance.',
		'اتبع التعليمات الحالية وتوجيهات الإخلاء والمسارات الآمنة الصادرة عن الجهات السعودية المختصة. إذا تعارضت الإرشادات الرسمية مع احتياط، فاتبع الإرشادات الرسمية.',
		10
	),
	(
		'check_official_updates',
		'Check official updates',
		'تابع التحديثات الرسمية',
		'Monitor current information from the competent Saudi authorities and continue following updated warnings and safety instructions.',
		'تابع المعلومات الحالية الصادرة عن الجهات السعودية المختصة واستمر في متابعة التحذيرات وإرشادات السلامة المحدثة.',
		20
	),
	(
		'prepare_backup_phone_power',
		'Prepare backup phone power',
		'جهّز طاقة احتياطية للهاتف',
		'Keep a charged power bank, phone charger or another suitable backup charging option ready so that you can continue receiving information and making necessary calls.',
		'احتفظ ببطارية شحن متنقلة مشحونة أو شاحن للهاتف أو وسيلة مناسبة أخرى للشحن الاحتياطي حتى تتمكن من متابعة المعلومات وإجراء الاتصالات الضرورية.',
		30
	),
	(
		'avoid_flooded_routes',
		'Avoid floodwater and flooded routes',
		'تجنب مياه السيول والطرق المغمورة',
		'Stay away from valleys, torrent streams, low areas and water accumulations. Do not attempt to cross floodwater or flowing valleys.',
		'ابتعد عن الأودية ومجاري السيول والمناطق المنخفضة وتجمعات المياه. لا تحاول عبور مياه السيول أو الأودية الجارية.',
		40
	),
	(
		'avoid_wet_electrical_hazards',
		'Keep away from wet electrical hazards',
		'ابتعد عن مخاطر الكهرباء المبتلة',
		'Keep away from fallen or wet electrical wires, electrical equipment and other electrical hazards affected by floodwater.',
		'ابتعد عن الأسلاك الكهربائية الساقطة أو المبتلة والمعدات الكهربائية وغيرها من المخاطر الكهربائية المتأثرة بمياه السيول.',
		50
	),
	(
		'move_to_cool_place_and_hydrate',
		'Move to a cooler place and maintain fluids',
		'انتقل إلى مكان أبرد واحرص على السوائل',
		'Reduce unnecessary direct heat exposure, drink sufficient fluids, rest and move to a shaded or air-conditioned place when conditions are very hot.',
		'قلّل التعرض المباشر غير الضروري للحرارة، واشرب كمية كافية من السوائل، وخذ قسطاً من الراحة، وانتقل إلى مكان مظلل أو مكيف عندما تكون الأجواء شديدة الحرارة.',
		60
	),
	(
		'check_vulnerable_household_heat',
		'Check household members more vulnerable to extreme heat',
		'اطمئن على أفراد المنزل الأكثر عرضة لمخاطر الحر الشديد',
		'Check on children or older adults in the household during extreme heat and help them reduce heat exposure, maintain fluids and reach a cooler place when necessary.',
		'اطمئن على الأطفال أو كبار السن في المنزل أثناء الحر الشديد، وساعدهم على تقليل التعرض للحرارة والحفاظ على السوائل والوصول إلى مكان أبرد عند الحاجة.',
		70
	),
	(
		'stay_indoors_reduce_dust_exposure',
		'Stay indoors and reduce dust exposure',
		'ابقَ في الداخل وقلّل التعرض للغبار',
		'Stay at home or in another safe indoor place where possible and close doors and windows tightly to reduce blowing dust entering the building.',
		'ابقَ في المنزل أو في مكان داخلي آمن متى أمكن، وأغلق الأبواب والنوافذ بإحكام لتقليل دخول الغبار المتطاير إلى المبنى.',
		80
	),
	(
		'drive_cautiously_during_dust',
		'Use extra caution if driving during dust',
		'توخَّ حذراً إضافياً عند القيادة أثناء الغبار',
		'If driving is unavoidable, keep vehicle windows closed, leave sufficient distance from other vehicles and follow current official road-safety instructions.',
		'إذا كان لا بد من القيادة، فأغلق نوافذ المركبة واترك مسافة كافية عن المركبات الأخرى واتبع تعليمات السلامة المرورية الرسمية الحالية.',
		90
	),
	(
		'take_cover_during_earthquake',
		'Protect yourself during shaking',
		'احمِ نفسك أثناء الاهتزاز',
		'If you are indoors during earthquake shaking, take cover under a sturdy desk or table or beside a suitable interior wall, and keep away from glass and objects that may fall.',
		'إذا كنت داخل مبنى أثناء اهتزاز الزلزال، فاحتمِ تحت مكتب أو طاولة متينة أو بجوار جدار داخلي مناسب، وابتعد عن الزجاج والأشياء التي قد تسقط.',
		100
	),
	(
		'avoid_lifts_after_earthquake',
		'Do not use lifts during the earthquake',
		'لا تستخدم المصاعد أثناء الزلزال',
		'Stay indoors until the shaking stops, make sure it is safe before leaving and do not use lifts during the event.',
		'ابقَ داخل المبنى حتى يتوقف الاهتزاز، وتأكد من أن الخروج آمن، ولا تستخدم المصاعد أثناء الحدث.',
		110
	),
	(
		'avoid_rockfall_prone_areas',
		'Avoid rockfall-prone roads and slopes',
		'تجنب الطرق والمنحدرات المعرضة لتساقط الصخور',
		'Avoid roads or areas identified as vulnerable to rockfall or collapse and use extra caution near mountains and mountain roads.',
		'تجنب الطرق أو المواقع المعروفة بقابليتها لتساقط الصخور أو الانهيار، وتوخَّ حذراً إضافياً قرب الجبال والطرق الجبلية.',
		120
	),
	(
		'keep_safe_distance_from_rockfall',
		'Keep a safe distance from rockfall or collapse',
		'ابقَ على مسافة آمنة من تساقط الصخور أو الانهيار',
		'If a collapse or rockfall occurs, keep a safe distance and do not approach merely to inspect the site.',
		'إذا وقع انهيار أو تساقط للصخور، فابتعد مسافة آمنة ولا تقترب من الموقع لمجرد تفقده.',
		130
	),
	(
		'heat_home_safely',
		'Keep the home warm safely',
		'حافظ على دفء المنزل بطريقة آمنة',
		'Keep the home warm using safe heating practices, maintain appropriate ventilation and keep flammable materials away from heat sources.',
		'حافظ على دفء المنزل باستخدام وسائل تدفئة آمنة، وحافظ على التهوية المناسبة، وأبعد المواد القابلة للاشتعال عن مصادر الحرارة.',
		140
	),
	(
		'avoid_unsafe_indoor_firewood',
		'Avoid unsafe indoor firewood burning',
		'تجنب إشعال الحطب بصورة غير آمنة داخل الأماكن المغلقة',
		'Do not burn firewood in closed areas where fumes and gases can accumulate. Maintain appropriate ventilation and follow current safety instructions.',
		'لا تشعل الحطب في الأماكن المغلقة التي قد تتجمع فيها الأبخرة والغازات. حافظ على التهوية المناسبة واتبع إرشادات السلامة الحالية.',
		150
	),
	(
		'seek_safe_thunderstorm_shelter',
		'Seek suitable shelter during thunderstorms',
		'التمس مأوى مناسباً أثناء العواصف الرعدية',
		'Seek shelter inside a suitable building or vehicle during severe thunderstorms, lightning or strong winds.',
		'احتمِ داخل مبنى مناسب أو مركبة أثناء العواصف الرعدية الشديدة أو البرق أو الرياح القوية.',
		160
	),
	(
		'avoid_exposed_thunderstorm_areas',
		'Avoid exposed areas during thunderstorms',
		'تجنب الأماكن المكشوفة أثناء العواصف الرعدية',
		'Keep away from open areas, trees, metal structures and other unsafe exposed locations during thunderstorms and lightning.',
		'ابتعد عن الأماكن المفتوحة والأشجار والمنشآت المعدنية وغيرها من المواقع المكشوفة غير الآمنة أثناء العواصف الرعدية والبرق.',
		170
	),
	(
		'keep_away_from_vegetation_fire',
		'Keep away from a vegetation-fire danger area',
		'ابتعد عن منطقة خطر حريق الغطاء النباتي',
		'Keep away from the dangerous area, avoid unnecessary approach and follow current Saudi Civil Defense and other competent-authority instructions.',
		'ابتعد عن منطقة الخطر وتجنب الاقتراب غير الضروري واتبع تعليمات الدفاع المدني السعودي والجهات المختصة الحالية.',
		180
	);


insert into public.actions (
	code,
	title_en,
	title_ar,
	instruction_en,
	instruction_ar,
	sort_order,
	is_active
)
select
	code,
	title_en,
	title_ar,
	instruction_en,
	instruction_ar,
	sort_order,
	true
from seed_actions
order by sort_order
on conflict (code)
do update
set
	title_en = excluded.title_en,
	title_ar = excluded.title_ar,
	instruction_en = excluded.instruction_en,
	instruction_ar = excluded.instruction_ar,
	sort_order = excluded.sort_order,
	is_active = true;


/* ==========================================================================
 * 4. DETERMINISTIC ACTION-RULE MANIFEST
 * ========================================================================== *
 *
 * The numbers below are transparent author-set prioritisation values.
 *
 * They are not probabilities or scientific risk estimates.
 *
 * Final score:
 *
 *     base_priority
 *     + (10 * current severity)
 *     + incomplete-task boost
 *     + applicable safety override
 *
 * Flooding preserves the three exact priority fixtures documented in the
 * preliminary prototype:
 *
 *     Follow official directions:
 *         130 + (10 * 3) + 1000 = 1160
 *
 *     Avoid flooded routes:
 *         110 + (10 * 3) + 800 = 940
 *
 *     Check official updates:
 *         90 + (10 * 3) + 500 = 620
 *
 * Other hazard priorities follow the same inspectable deterministic model.
 * Important: They are project configuration values rather than official government
 * severity scores.
*/


create temporary table seed_action_rules (
	code text primary key,
	action_code text not null,
	hazard_code text not null,
	linked_task_code text,
	min_severity smallint not null,
	base_priority integer not null,
	incomplete_task_boost integer not null,
	safety_override integer not null,
	safety_override_min_severity smallint,
	min_children_count smallint,
	min_older_adults_count smallint,
	reason_en text not null,
	reason_ar text not null,
	sort_order smallint not null
) on commit drop;


insert into seed_action_rules (
	code,
	action_code,
	hazard_code,
	linked_task_code,
	min_severity,
	base_priority,
	incomplete_task_boost,
	safety_override,
	safety_override_min_severity,
	min_children_count,
	min_older_adults_count,
	reason_en,
	reason_ar,
	sort_order
)
values

	/* ----------------------------------------------------------------------
	 * Heavy rain / flash flooding — five rules
	 * ---------------------------------------------------------------------- 
    */

	(
		'flood_follow_official_directions',
		'follow_official_directions',
		'heavy_rain_flash_flooding',
		null,
		3,
		130,
		0,
		1000,
		3,
		null,
		null,
		'At severe flood severity, official evacuation, route and safety instructions take the highest priority.',
		'عند شدة السيول العالية تكون تعليمات الإخلاء والمسارات والسلامة الرسمية ذات الأولوية القصوى.',
		10
	),
	(
		'flood_avoid_flooded_routes',
		'avoid_flooded_routes',
		'heavy_rain_flash_flooding',
		null,
		2,
		110,
		0,
		800,
		2,
		null,
		null,
		'Floodwater, valleys and torrent streams can become dangerous quickly, so route avoidance receives a strong safety priority.',
		'يمكن أن تصبح مياه السيول والأودية ومجاري السيول خطرة بسرعة، لذلك يحظى تجنبها بأولوية سلامة مرتفعة.',
		20
	),
	(
		'flood_avoid_wet_electrical_hazards',
		'avoid_wet_electrical_hazards',
		'heavy_rain_flash_flooding',
		null,
		2,
		85,
		0,
		400,
		2,
		null,
		null,
		'Floodwater can increase danger around fallen or wet electrical equipment, so electrical-hazard avoidance is prioritised.',
		'قد تزيد مياه السيول الخطر حول المعدات والأسلاك الكهربائية الساقطة أو المبتلة، لذلك تُعطى أولوية لتجنب مخاطر الكهرباء.',
		30
	),
	(
		'flood_check_official_updates',
		'check_official_updates',
		'heavy_rain_flash_flooding',
		null,
		1,
		90,
		0,
		500,
		1,
		null,
		null,
		'Heavy-rain and flood conditions can change quickly, so current official updates remain important throughout the event.',
		'يمكن أن تتغير ظروف الأمطار الغزيرة والسيول بسرعة، لذلك تظل متابعة التحديثات الرسمية الحالية مهمة طوال الحالة.',
		40
	),
	(
		'flood_prepare_backup_phone_power',
		'prepare_backup_phone_power',
		'heavy_rain_flash_flooding',
		'kit_phone_backup_power',
		1,
		70,
		25,
		0,
		null,
		null,
		null,
		'Backup phone power becomes more relevant when the preparedness task for backup charging is still incomplete.',
		'تزداد أهمية الطاقة الاحتياطية للهاتف عندما لا تكون مهمة الاستعداد الخاصة بالشحن الاحتياطي مكتملة بعد.',
		50
	),


	/* ----------------------------------------------------------------------
	 * Extreme heat — five rules
	 * ---------------------------------------------------------------------- 
    */

	(
		'heat_follow_official_directions',
		'follow_official_directions',
		'extreme_heat_heatwave',
		null,
		3,
		120,
		0,
		900,
		3,
		null,
		null,
		'During severe heat, current health and safety instructions from competent authorities receive high priority.',
		'أثناء الحر الشديد تُعطى أولوية مرتفعة لتعليمات الصحة والسلامة الحالية الصادرة عن الجهات المختصة.',
		10
	),
	(
		'heat_move_to_cool_place_and_hydrate',
		'move_to_cool_place_and_hydrate',
		'extreme_heat_heatwave',
		null,
		2,
		125,
		0,
		700,
		2,
		null,
		null,
		'Reducing heat exposure, maintaining fluids and reaching a cooler place are direct protective actions during extreme heat.',
		'تقليل التعرض للحرارة والحفاظ على السوائل والوصول إلى مكان أبرد إجراءات حماية مباشرة أثناء الحر الشديد.',
		20
	),
	(
		'heat_check_children',
		'check_vulnerable_household_heat',
		'extreme_heat_heatwave',
		null,
		2,
		110,
		0,
		450,
		2,
		1,
		null,
		'The saved household profile includes at least one child, a group identified as more vulnerable during extreme heat.',
		'يتضمن ملف الأسرة المحفوظ طفلاً واحداً على الأقل، وهي فئة تُعد أكثر عرضة للمخاطر أثناء الحر الشديد.',
		30
	),
	(
		'heat_check_older_adults',
		'check_vulnerable_household_heat',
		'extreme_heat_heatwave',
		null,
		2,
		110,
		0,
		450,
		2,
		null,
		1,
		'The saved household profile includes at least one older adult, a group identified as more vulnerable during extreme heat.',
		'يتضمن ملف الأسرة المحفوظ شخصاً واحداً على الأقل من كبار السن، وهي فئة تُعد أكثر عرضة للمخاطر أثناء الحر الشديد.',
		40
	),
	(
		'heat_check_official_updates',
		'check_official_updates',
		'extreme_heat_heatwave',
		null,
		1,
		80,
		0,
		300,
		1,
		null,
		null,
		'Current official health and weather information may change as heat conditions develop.',
		'قد تتغير المعلومات الصحية والجوية الرسمية الحالية مع تطور ظروف الحر.',
		50
	),


	/* ----------------------------------------------------------------------
	 * Dust / sandstorm — four rules
	 * ---------------------------------------------------------------------- */

	(
		'dust_follow_official_directions',
		'follow_official_directions',
		'dust_sandstorm',
		null,
		3,
		120,
		0,
		900,
		3,
		null,
		null,
		'At severe dust or sandstorm severity, current official travel and safety instructions receive high priority.',
		'عند شدة الغبار أو العاصفة الرملية العالية تُعطى أولوية مرتفعة لتعليمات التنقل والسلامة الرسمية الحالية.',
		10
	),
	(
		'dust_stay_indoors',
		'stay_indoors_reduce_dust_exposure',
		'dust_sandstorm',
		null,
		2,
		120,
		0,
		700,
		2,
		null,
		null,
		'Staying in a safe indoor place and reducing blowing-dust exposure are direct protective actions during severe dust conditions.',
		'البقاء في مكان داخلي آمن وتقليل التعرض للغبار المتطاير إجراءات حماية مباشرة أثناء حالات الغبار الشديدة.',
		20
	),
	(
		'dust_drive_cautiously',
		'drive_cautiously_during_dust',
		'dust_sandstorm',
		null,
		2,
		105,
		0,
		500,
		2,
		null,
		null,
		'Reduced visibility and blowing dust make additional driving precautions important when travel cannot be avoided.',
		'يؤدي انخفاض مدى الرؤية والغبار المتطاير إلى زيادة أهمية احتياطات القيادة عندما يتعذر تجنب التنقل.',
		30
	),
	(
		'dust_check_official_updates',
		'check_official_updates',
		'dust_sandstorm',
		null,
		1,
		80,
		0,
		300,
		1,
		null,
		null,
		'Dust and wind conditions may change, so current official updates remain important.',
		'قد تتغير ظروف الغبار والرياح، لذلك تظل متابعة التحديثات الرسمية الحالية مهمة.',
		40
	),


	/* ----------------------------------------------------------------------
	 * Earthquake — four rules
	 * ---------------------------------------------------------------------- */

	(
		'earthquake_take_cover',
		'take_cover_during_earthquake',
		'earthquake',
		null,
		1,
		135,
		0,
		1000,
		1,
		null,
		null,
		'Immediate protection from falling objects and glass is a primary action while earthquake shaking is occurring.',
		'تُعد الحماية الفورية من الأجسام الساقطة والزجاج إجراءً أساسياً أثناء اهتزاز الزلزال.',
		10
	),
	(
		'earthquake_follow_official_directions',
		'follow_official_directions',
		'earthquake',
		null,
		2,
		120,
		0,
		800,
		2,
		null,
		null,
		'Official emergency information becomes increasingly important after stronger earthquake effects.',
		'تزداد أهمية معلومات الطوارئ الرسمية بعد تأثيرات الزلازل الأقوى.',
		20
	),
	(
		'earthquake_avoid_lifts',
		'avoid_lifts_after_earthquake',
		'earthquake',
		null,
		1,
		110,
		0,
		600,
		1,
		null,
		null,
		'Lift use is avoided during the event and safe conditions should be confirmed before leaving the building.',
		'يجب تجنب استخدام المصاعد أثناء الحدث والتأكد من سلامة الظروف قبل مغادرة المبنى.',
		30
	),
	(
		'earthquake_check_official_updates',
		'check_official_updates',
		'earthquake',
		null,
		1,
		80,
		0,
		300,
		1,
		null,
		null,
		'Official emergency information can provide important post-event safety instructions.',
		'يمكن أن توفر معلومات الطوارئ الرسمية إرشادات سلامة مهمة بعد الحدث.',
		40
	),


	/* ----------------------------------------------------------------------
	 * Landslide / rockfall — four rules
	 * ---------------------------------------------------------------------- */

	(
		'rockfall_follow_official_directions',
		'follow_official_directions',
		'landslide_rockfall',
		null,
		2,
		120,
		0,
		800,
		2,
		null,
		null,
		'Official road closures and danger-area instructions receive high priority when rockfall or slope collapse is possible.',
		'تُعطى أولوية مرتفعة لتعليمات إغلاق الطرق ومناطق الخطر الرسمية عند احتمال تساقط الصخور أو انهيار المنحدرات.',
		10
	),
	(
		'rockfall_avoid_prone_areas',
		'avoid_rockfall_prone_areas',
		'landslide_rockfall',
		null,
		2,
		125,
		0,
		750,
		2,
		null,
		null,
		'Avoiding roads and slopes known to be vulnerable to rockfall directly reduces exposure to the hazard.',
		'يساعد تجنب الطرق والمنحدرات المعرضة لتساقط الصخور على تقليل التعرض المباشر للخطر.',
		20
	),
	(
		'rockfall_keep_safe_distance',
		'keep_safe_distance_from_rockfall',
		'landslide_rockfall',
		null,
		2,
		115,
		0,
		650,
		2,
		null,
		null,
		'Keeping away from an active collapse or rockfall area reduces exposure to continuing movement and falling material.',
		'يقلل الابتعاد عن منطقة الانهيار أو تساقط الصخور النشطة من التعرض للحركة المستمرة والمواد المتساقطة.',
		30
	),
	(
		'rockfall_check_official_updates',
		'check_official_updates',
		'landslide_rockfall',
		null,
		1,
		80,
		0,
		300,
		1,
		null,
		null,
		'Current official information can identify dangerous roads, closures or other local restrictions.',
		'يمكن للمعلومات الرسمية الحالية تحديد الطرق الخطرة أو المغلقة أو القيود المحلية الأخرى.',
		40
	),


	/* ----------------------------------------------------------------------
	 * Cold wave — four rules
	 * ---------------------------------------------------------------------- */

	(
		'cold_follow_official_directions',
		'follow_official_directions',
		'cold_wave',
		null,
		3,
		120,
		0,
		800,
		3,
		null,
		null,
		'During severe cold conditions, current official safety instructions receive high priority.',
		'أثناء ظروف البرد الشديد تُعطى أولوية مرتفعة لإرشادات السلامة الرسمية الحالية.',
		10
	),
	(
		'cold_avoid_unsafe_firewood',
		'avoid_unsafe_indoor_firewood',
		'cold_wave',
		null,
		2,
		125,
		0,
		750,
		2,
		null,
		null,
		'Unsafe burning in closed spaces can create additional danger while households are trying to stay warm.',
		'قد يؤدي إشعال النار بصورة غير آمنة في الأماكن المغلقة إلى مخاطر إضافية أثناء محاولة تدفئة المنزل.',
		20
	),
	(
		'cold_heat_home_safely',
		'heat_home_safely',
		'cold_wave',
		null,
		2,
		115,
		0,
		600,
		2,
		null,
		null,
		'Safe heating practices, suitable ventilation and separation from flammable materials reduce secondary cold-weather risks.',
		'تساعد ممارسات التدفئة الآمنة والتهوية المناسبة وإبعاد المواد القابلة للاشتعال على تقليل المخاطر الثانوية أثناء البرد.',
		30
	),
	(
		'cold_check_official_updates',
		'check_official_updates',
		'cold_wave',
		null,
		1,
		80,
		0,
		300,
		1,
		null,
		null,
		'Cold-wave conditions can change and official safety guidance should continue to be monitored.',
		'قد تتغير ظروف موجة البرد ويجب الاستمرار في متابعة إرشادات السلامة الرسمية.',
		40
	),


	/* ----------------------------------------------------------------------
	 * Thunderstorm / lightning / strong winds — four rules
	 * ---------------------------------------------------------------------- */

	(
		'thunderstorm_follow_official_directions',
		'follow_official_directions',
		'thunderstorm_lightning_strong_winds',
		null,
		3,
		120,
		0,
		800,
		3,
		null,
		null,
		'Official severe-weather instructions receive high priority as thunderstorm and wind severity increases.',
		'تزداد أولوية تعليمات الطقس الشديد الرسمية مع ارتفاع شدة العواصف الرعدية والرياح.',
		10
	),
	(
		'thunderstorm_seek_shelter',
		'seek_safe_thunderstorm_shelter',
		'thunderstorm_lightning_strong_winds',
		null,
		2,
		130,
		0,
		800,
		2,
		null,
		null,
		'Moving into a suitable building or vehicle reduces exposure during severe thunderstorms and lightning.',
		'يساعد الانتقال إلى مبنى مناسب أو مركبة على تقليل التعرض للخطر أثناء العواصف الرعدية والبرق الشديد.',
		20
	),
	(
		'thunderstorm_avoid_exposed_areas',
		'avoid_exposed_thunderstorm_areas',
		'thunderstorm_lightning_strong_winds',
		null,
		2,
		120,
		0,
		700,
		2,
		null,
		null,
		'Open areas, trees and metal structures can increase exposure during thunderstorms and lightning.',
		'قد تزيد الأماكن المفتوحة والأشجار والمنشآت المعدنية من التعرض للخطر أثناء العواصف الرعدية والبرق.',
		30
	),
	(
		'thunderstorm_check_official_updates',
		'check_official_updates',
		'thunderstorm_lightning_strong_winds',
		null,
		1,
		80,
		0,
		300,
		1,
		null,
		null,
		'Thunderstorm and wind conditions can change quickly, so official updates remain important.',
		'يمكن أن تتغير ظروف العواصف الرعدية والرياح بسرعة، لذلك تظل متابعة التحديثات الرسمية مهمة.',
		40
	),


	/* ----------------------------------------------------------------------
	 * Wildfire / vegetation fire — three deliberately narrow rules
	 * ---------------------------------------------------------------------- */

	(
		'wildfire_keep_away',
		'keep_away_from_vegetation_fire',
		'wildfire_vegetation_fire',
		null,
		1,
		140,
		0,
		1000,
		1,
		null,
		null,
		'Keeping away from the dangerous fire area limits unnecessary exposure to an active vegetation-fire emergency.',
		'يحد الابتعاد عن منطقة الحريق الخطرة من التعرض غير الضروري لحالة طوارئ حريق الغطاء النباتي.',
		10
	),
	(
		'wildfire_follow_official_directions',
		'follow_official_directions',
		'wildfire_vegetation_fire',
		null,
		2,
		120,
		0,
		900,
		2,
		null,
		null,
		'Official emergency and evacuation instructions take high priority when a vegetation fire threatens people or access routes.',
		'تُعطى أولوية مرتفعة لتعليمات الطوارئ والإخلاء الرسمية عندما يهدد حريق الغطاء النباتي الأشخاص أو طرق الوصول.',
		20
	),
	(
		'wildfire_check_official_updates',
		'check_official_updates',
		'wildfire_vegetation_fire',
		null,
		1,
		80,
		0,
		300,
		1,
		null,
		null,
		'Current official information should be monitored as vegetation-fire conditions develop.',
		'يجب متابعة المعلومات الرسمية الحالية مع تطور ظروف حريق الغطاء النباتي.',
		30
	);


/*
 * Rules deliberately use NULL location_id.
 *
 * Geographic applicability belongs to the alert itself. Keeping baseline
 * rules hazard-scoped allows the same reviewed safety rule to be reused if a
 * second Saudi location later receives an alert for the same hazard.
 */
insert into public.action_rules (
	code,
	action_id,
	hazard_id,
	location_id,
	linked_task_id,
	min_severity,
	base_priority,
	incomplete_task_boost,
	safety_override,
	safety_override_min_severity,
	min_children_count,
	min_older_adults_count,
	reason_en,
	reason_ar,
	sort_order,
	is_active
)
select
	seed.code,
	action.id,
	hazard.id,
	null,
	task.id,
	seed.min_severity,
	seed.base_priority,
	seed.incomplete_task_boost,
	seed.safety_override,
	seed.safety_override_min_severity,
	seed.min_children_count,
	seed.min_older_adults_count,
	seed.reason_en,
	seed.reason_ar,
	seed.sort_order,
	true
from seed_action_rules as seed
join public.actions as action
	on action.code = seed.action_code
join public.hazards as hazard
	on hazard.code = seed.hazard_code
left join public.mission_tasks as task
	on task.code = seed.linked_task_code
order by
	hazard.sort_order,
	seed.sort_order
on conflict (code)
do update
set
	action_id = excluded.action_id,
	hazard_id = excluded.hazard_id,
	location_id = excluded.location_id,
	linked_task_id = excluded.linked_task_id,
	min_severity = excluded.min_severity,
	base_priority = excluded.base_priority,
	incomplete_task_boost = excluded.incomplete_task_boost,
	safety_override = excluded.safety_override,
	safety_override_min_severity =
		excluded.safety_override_min_severity,
	min_children_count = excluded.min_children_count,
	min_older_adults_count = excluded.min_older_adults_count,
	reason_en = excluded.reason_en,
	reason_ar = excluded.reason_ar,
	sort_order = excluded.sort_order,
	is_active = true;


/* ==========================================================================
 * 5. MIGRATION-TIME MANIFEST VALIDATION
 * ==========================================================================
 *
 * These checks fail the migration immediately if an upstream catalogue code
 * changes or a relationship silently fails to resolve.
*/


do $$
begin
	if (
		select count(*)
		from seed_alert_catalogue
	) <> 8 then
		raise exception
			'Alert seed manifest must contain exactly 8 simulation rows';
	end if;


	if (
		select count(*)
		from seed_actions
	) <> 18 then
		raise exception
			'Action seed manifest must contain exactly 18 reusable actions';
	end if;


	if (
		select count(*)
		from seed_action_rules
	) <> 33 then
		raise exception
			'Action-rule seed manifest must contain exactly 33 rules';
	end if;


	if (
		select count(*)
		from public.alerts as alert
		join seed_alert_catalogue as seed
			on seed.code = alert.code
		where alert.origin_type = 'simulated'
			and alert.publication_status = 'published'
			and alert.severity = 3
	) <> 8 then
		raise exception
			'Alert seed did not produce all 8 expected severe simulations';
	end if;


	if (
		select count(*)
		from public.alert_locations as link
		join public.alerts as alert
			on alert.id = link.alert_id
		join seed_alert_location_links as seed
			on seed.alert_code = alert.code
		join public.locations as location
			on location.id = link.location_id
			and location.official_code =
				seed.location_official_code
	) <> 5 then
		raise exception
			'Alert seed did not produce all 5 expected location links';
	end if;


	if (
		select count(*)
		from public.actions as action
		join seed_actions as seed
			on seed.code = action.code
		where action.is_active
	) <> 18 then
		raise exception
			'Action seed did not produce all 18 active actions';
	end if;


	if (
		select count(*)
		from public.action_rules as rule
		join seed_action_rules as seed
			on seed.code = rule.code
		where rule.is_active
	) <> 33 then
		raise exception
			'Action-rule seed did not produce all 33 active rules';
	end if;


	if not exists (
		select 1
		from public.action_rules as rule
		join public.mission_tasks as task
			on task.id = rule.linked_task_id
		where rule.code = 'flood_prepare_backup_phone_power'
			and task.code = 'kit_phone_backup_power'
			and rule.incomplete_task_boost = 25
	) then
		raise exception
			'Flood backup-power rule must link to kit_phone_backup_power with a 25-point incomplete-task boost';
	end if;


	if (
		select count(*)
		from public.action_rules
		where min_children_count is not null
			or min_older_adults_count is not null
	) <> 2 then
		raise exception
			'Exactly two household-aware heat rules were expected';
	end if;


	if exists (
		select 1
		from public.action_rules as rule
		join public.hazards as hazard
			on hazard.id = rule.hazard_id
		where hazard.code = 'drought_water_scarcity'
	) then
		raise exception
			'Drought hazard must remain outside the urgent V1 action-rule engine';
	end if;
end;
$$;


commit;