/*
 * Ihtiyat preparedness mission and task content seed.
 *
 * Final V1 mission sequence:
 *   1. Prepare a First Aid Kit
 *   2. Household Emergency Kit
 *   3. Household & Communication Readiness
 *   4. Know Your Local Hazards
 *
 * The first three missions are national. The fourth is adaptive: its
 * hazard-linked tasks are later filtered and ordered from the user's selected
 * location through the existing location-hazard resolver.
 *
 * Task points are engagement/progress feedback only. They are not a
 * scientific readiness score or a certification of household safety.
 */

begin;


/* -------------------------------------------------------------------------
 * 1. FINAL V1 PREPAREDNESS MISSION CATALOGUE
 * ------------------------------------------------------------------------- 
*/

create temporary table seed_preparedness_missions (
    code text primary key,
    title_en text not null,
    title_ar text not null,
    description_en text not null,
    description_ar text not null,
    mission_scope text not null,
    sort_order smallint not null,
    is_active boolean not null,

    constraint seed_preparedness_missions_code_format
        check (code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),

    constraint seed_preparedness_missions_scope_valid
        check (mission_scope in ('national', 'adaptive')),

    constraint seed_preparedness_missions_sort_order_non_negative
        check (sort_order >= 0)
) on commit drop;


insert into seed_preparedness_missions (
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
        'prepare_first_aid_kit',
        'Prepare a First Aid Kit',
        'جهّز حقيبة إسعافات أولية',
        'Prepare, check and keep a household first-aid kit ready before an emergency.',
        'جهّز حقيبة إسعافات أولية منزلية وافحصها وحافظ على جاهزيتها قبل الطوارئ.',
        'national',
        10,
        true
    ),
    (
        'household_emergency_kit',
        'Household Emergency Kit',
        'حقيبة الطوارئ المنزلية',
        'Build on your prepared first-aid kit and assemble essential household emergency supplies.',
        'استفد من حقيبة الإسعافات الأولية المجهزة واجمع مستلزمات الطوارئ المنزلية الأساسية.',
        'national',
        20,
        true
    ),
    (
        'household_communication_readiness',
        'Household & Communication Readiness',
        'الاستعداد الأسري والتواصل',
        'Agree how your household will communicate, meet, leave safely and follow official information during an emergency.',
        'اتفق على طريقة تواصل الأسرة ونقطة التجمع والخروج الآمن ومتابعة المعلومات الرسمية أثناء الطوارئ.',
        'national',
        30,
        true
    ),
    (
        'know_your_local_hazards',
        'Know Your Local Hazards',
        'تعرّف على المخاطر المحلية في منطقتك',
        'Learn about the hazards prioritised for your selected location and practise how to respond to them.',
        'تعرّف على المخاطر ذات الأولوية لموقعك المحدد وتدرّب على كيفية الاستجابة لها.',
        'adaptive',
        40,
        true
    );


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
select
    code,
    title_en,
    title_ar,
    description_en,
    description_ar,
    mission_scope,
    sort_order,
    is_active
from seed_preparedness_missions
order by sort_order
on conflict (code)
do update
set
    title_en = excluded.title_en,
    title_ar = excluded.title_ar,
    description_en = excluded.description_en,
    description_ar = excluded.description_ar,
    mission_scope = excluded.mission_scope,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;


do $$
begin
    if (
        select count(*)
        from seed_preparedness_missions
    ) <> 4 then
        raise exception
            'Preparedness mission seed manifest must contain exactly 4 rows';
    end if;

    if (
        select count(*)
        from public.preparedness_missions as mission
        join seed_preparedness_missions as seed
            on seed.code = mission.code
        where mission.is_active
            and mission.title_en = seed.title_en
            and mission.title_ar = seed.title_ar
            and mission.description_en = seed.description_en
            and mission.description_ar = seed.description_ar
            and mission.mission_scope = seed.mission_scope
            and mission.sort_order = seed.sort_order
    ) <> 4 then
        raise exception
            'Preparedness mission seed did not produce the expected 4 active definitions';
    end if;
end;
$$;


/* -------------------------------------------------------------------------
 * 2. CONTROLLED MISSION-TASK MANIFEST
 * ------------------------------------------------------------------------- */

create temporary table seed_preparedness_mission_tasks (
    mission_code text not null,
    hazard_code text,
    code text primary key,
    title_en text not null,
    title_ar text not null,
    detail_en text not null,
    detail_ar text not null,
    points smallint not null,
    sort_order smallint not null,

    constraint seed_preparedness_mission_tasks_mission_code_format
        check (mission_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),

    constraint seed_preparedness_mission_tasks_hazard_code_format
        check (
            hazard_code is null
            or hazard_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
        ),

    constraint seed_preparedness_mission_tasks_code_format
        check (code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),

    constraint seed_preparedness_mission_tasks_points_valid
        check (points between 1 and 100),

    constraint seed_preparedness_mission_tasks_sort_order_non_negative
        check (sort_order >= 0),

    constraint seed_preparedness_mission_tasks_order_unique
        unique (mission_code, sort_order)
) on commit drop;

/* -------------------------------------------------------------------------
 * 3. SEED MISSION TASKS
 * ------------------------------------------------------------------------- */

insert into seed_preparedness_mission_tasks (
    mission_code,
    hazard_code,
    code,
    title_en,
    title_ar,
    detail_en,
    detail_ar,
    points,
    sort_order
)
values
    (
        'prepare_first_aid_kit',
        null,
        'first_aid_kit_ready',
        'Have a household first-aid kit ready',
        'جهّز حقيبة إسعافات أولية للمنزل',
        'Make sure a household first-aid kit is available before an emergency.',
        'تأكد من توفر حقيبة إسعافات أولية منزلية قبل حدوث الطوارئ.',
        20,
        10
    ),
    (
        'prepare_first_aid_kit',
        null,
        'first_aid_review_contents',
        'Review the first-aid kit contents',
        'راجع محتويات حقيبة الإسعافات الأولية',
        'Review what belongs in the kit using the linked, reviewed first-aid guidance.',
        'راجع ما ينبغي أن تحتويه الحقيبة باستخدام إرشادات الإسعافات الأولية المراجعة والمرتبطة بالمهمة.',
        20,
        20
    ),
    (
        'prepare_first_aid_kit',
        null,
        'first_aid_check_supplies',
        'Check that first-aid supplies are usable',
        'تحقق من صلاحية مستلزمات الإسعافات الأولية',
        'Check the kit regularly and replace supplies that are missing, damaged or no longer suitable for use.',
        'افحص الحقيبة بانتظام واستبدل المستلزمات الناقصة أو التالفة أو التي لم تعد صالحة للاستخدام.',
        20,
        30
    ),
    (
        'prepare_first_aid_kit',
        null,
        'first_aid_known_location',
        'Keep the first-aid kit in a known place',
        'احفظ حقيبة الإسعافات الأولية في مكان معروف',
        'Keep the kit in a consistent, accessible place and make sure responsible household members know where it is.',
        'احفظ الحقيبة في مكان ثابت وسهل الوصول وتأكد من أن أفراد المنزل المسؤولين يعرفون مكانها.',
        20,
        40
    ),
    (
        'prepare_first_aid_kit',
        null,
        'first_aid_review_basics',
        'Review basic first-aid principles',
        'راجع مبادئ الإسعافات الأولية الأساسية',
        'Review scene safety, how to assess an injured or unwell person, when to call emergency services, and how to provide appropriate initial help within your knowledge.',
        'راجع سلامة المكان، وكيفية تقييم حالة شخص مصاب أو مريض، ومتى يجب طلب خدمات الطوارئ، وكيفية تقديم المساعدة الأولية المناسبة ضمن حدود معرفتك.',
        20,
        50
    ),
    (
        'household_emergency_kit',
        null,
        'kit_water_food',
        'Prepare emergency water and suitable food',
        'جهّز مياه الطوارئ والغذاء المناسب',
        'Keep bottled water and suitable non-perishable food among your household emergency supplies.',
        'احتفظ بمياه معبأة وأغذية مناسبة غير قابلة للتلف ضمن مستلزمات الطوارئ المنزلية.',
        20,
        10
    ),
    (
        'household_emergency_kit',
        null,
        'kit_flashlight_batteries',
        'Keep a flashlight and spare batteries ready',
        'احتفظ بكشاف وبطاريات إضافية جاهزة',
        'Keep a battery-powered flashlight and spare batteries accessible for power outages or severe weather.',
        'احتفظ بكشاف يعمل بالبطارية وبطاريات إضافية في مكان يسهل الوصول إليه عند انقطاع الكهرباء أو سوء الأحوال الجوية.',
        20,
        20
    ),
    (
        'household_emergency_kit',
        null,
        'kit_phone_backup_power',
        'Prepare backup power for your phone',
        'جهّز وسيلة احتياطية لشحن الهاتف',
        'Keep a phone charger and a fully charged power bank or another suitable backup charging option ready with your emergency supplies.',
        'احتفظ بشاحن للهاتف وببطارية شحن متنقلة مشحونة بالكامل أو وسيلة أخرى مناسبة للشحن الاحتياطي ضمن مستلزمات الطوارئ.',
        20,
        30
    ),
    (
        'household_emergency_kit',
        null,
        'kit_documents_medicines',
        'Prepare important documents and necessary medicines',
        'جهّز الوثائق المهمة والأدوية الضرورية',
        'Keep important documents and necessary medicines ready as part of your household emergency supplies.',
        'احتفظ بالوثائق المهمة والأدوية الضرورية جاهزة ضمن مستلزمات الطوارئ المنزلية.',
        20,
        40
    ),
    (
        'household_emergency_kit',
        null,
        'kit_accessible_storage',
        'Keep the emergency kit easy to reach',
        'احفظ حقيبة الطوارئ في مكان يسهل الوصول إليه',
        'Keep the household emergency supplies together in a known, accessible place, alongside or near the first-aid kit prepared in Mission 1.',
        'احتفظ بمستلزمات الطوارئ المنزلية مجمعة في مكان معروف وسهل الوصول، مع حقيبة الإسعافات الأولية التي أعددتها في المهمة الأولى أو بالقرب منها.',
        20,
        50
    ),
    (
        'household_communication_readiness',
        null,
        'communication_emergency_number',
        'Know the emergency number for your region',
        'اعرف رقم الطوارئ في منطقتك',
        'Know which official emergency number applies to your selected Saudi region and use emergency numbers only when real assistance is needed.',
        'اعرف رقم الطوارئ الرسمي المناسب لمنطقتك المحددة في المملكة، واستخدم أرقام الطوارئ فقط عند الحاجة الفعلية للمساعدة.',
        20,
        10
    ),
    (
        'household_communication_readiness',
        null,
        'communication_meeting_point',
        'Agree on a household meeting point',
        'اتفق على نقطة تجمع لأفراد المنزل',
        'Choose a simple meeting point in advance in case household members become separated during an emergency.',
        'حدد مسبقًا نقطة تجمع بسيطة في حال تفرّق أفراد المنزل أثناء الطوارئ.',
        20,
        20
    ),
    (
        'household_communication_readiness',
        null,
        'communication_check_in_plan',
        'Agree how household members will check in',
        'اتفق على كيفية تواصل أفراد المنزل',
        'Agree how household members will contact or check on one another if normal communication is disrupted.',
        'اتفق على كيفية تواصل أفراد المنزل أو الاطمئنان على بعضهم إذا تعطلت وسائل الاتصال المعتادة.',
        20,
        30
    ),
    (
        'household_communication_readiness',
        null,
        'communication_exit_plan',
        'Review safe ways to leave the home',
        'راجع طرق الخروج الآمن من المنزل',
        'Review safe exits from the home and consider household members who may need extra help.',
        'راجع مخارج المنزل الآمنة وراعِ أفراد المنزل الذين قد يحتاجون إلى مساعدة إضافية.',
        20,
        40
    ),
    (
        'household_communication_readiness',
        null,
        'communication_official_sources',
        'Know where to check official warnings',
        'اعرف أين تتابع التحذيرات الرسمية',
        'Know how to reach official National Center for Meteorology and Saudi Civil Defense warning and safety information.',
        'اعرف كيفية الوصول إلى معلومات التحذير والسلامة الرسمية للمركز الوطني للأرصاد والدفاع المدني السعودي.',
        20,
        50
    ),
    (
        'know_your_local_hazards',
        'heavy_rain_flash_flooding',
        'local_hazard_flood',
        'Learn how to stay safe around floodwater',
        'تعلّم كيفية البقاء آمنًا قرب مياه السيول',
        'Review why valleys, low areas, torrent streams and floodwater crossings should be avoided during heavy rain.',
        'راجع أسباب ضرورة تجنب الأودية والمناطق المنخفضة ومجاري السيول وعبور مياه السيول أثناء الأمطار الغزيرة.',
        20,
        10
    ),
    (
        'know_your_local_hazards',
        'extreme_heat_heatwave',
        'local_hazard_heat',
        'Learn how to reduce heat-stress risk',
        'تعلّم كيفية تقليل مخاطر الإجهاد الحراري',
        'Review practical steps for reducing direct heat exposure, maintaining fluids and resting in cooler places.',
        'راجع الخطوات العملية لتقليل التعرض المباشر للحرارة والمحافظة على السوائل والراحة في أماكن أبرد.',
        20,
        20
    ),
    (
        'know_your_local_hazards',
        'dust_sandstorm',
        'local_hazard_dust',
        'Learn how to respond to dust and strong winds',
        'تعلّم كيفية التعامل مع الغبار والرياح الشديدة',
        'Review how to reduce dust exposure and travel more cautiously when blowing dust or strong winds occur.',
        'راجع كيفية تقليل التعرض للغبار وزيادة الحذر أثناء التنقل عند حدوث الغبار المتطاير أو الرياح الشديدة.',
        20,
        30
    ),
    (
        'know_your_local_hazards',
        'earthquake',
        'local_hazard_earthquake',
        'Learn where to take cover during an earthquake',
        'تعلّم أين تحتمي أثناء الزلزال',
        'Review where to take cover indoors, what to avoid during shaking and why lifts should not be used.',
        'راجع أماكن الاحتماء داخل المبنى وما يجب تجنبه أثناء الاهتزاز ولماذا لا ينبغي استخدام المصاعد.',
        20,
        40
    ),
    (
        'know_your_local_hazards',
        'landslide_rockfall',
        'local_hazard_landslide',
        'Learn about rockfall and slope hazards',
        'تعرّف على مخاطر تساقط الصخور والمنحدرات',
        'Review why mountain roads and slopes can become dangerous during heavy rain and why rockfall sites should be avoided.',
        'راجع أسباب ازدياد خطورة الطرق الجبلية والمنحدرات أثناء الأمطار الغزيرة وضرورة الابتعاد عن مواقع تساقط الصخور.',
        20,
        50
    );


/* -------------------------------------------------------------------------
 * 4. MANIFEST VALIDATION
 * ------------------------------------------------------------------------- */

do $$
begin
    if (
        select count(*)
        from seed_preparedness_mission_tasks
    ) <> 20 then
        raise exception
            'Preparedness task seed manifest must contain exactly 20 rows';
    end if;

    if exists (
        select 1
        from seed_preparedness_mission_tasks as task
        left join public.preparedness_missions as mission
            on mission.code = task.mission_code
        where mission.id is null
            or not mission.is_active
    ) then
        raise exception
            'Preparedness task seed references a missing or inactive mission';
    end if;

    if exists (
        select 1
        from seed_preparedness_mission_tasks as task
        left join public.hazards as hazard
            on hazard.code = task.hazard_code
        where task.hazard_code is not null
            and (
                hazard.id is null
                or not hazard.is_active
            )
    ) then
        raise exception
            'Preparedness task seed references a missing or inactive hazard';
    end if;

    if exists (
        select 1
        from seed_preparedness_mission_tasks
        where mission_code <> 'know_your_local_hazards'
            and hazard_code is not null
    ) then
        raise exception
            'National preparedness mission tasks must not be hazard-linked';
    end if;

    if (
        select count(*)
        from seed_preparedness_mission_tasks
        where mission_code = 'know_your_local_hazards'
            and hazard_code is not null
    ) <> 5 then
        raise exception
            'Adaptive local-hazard mission must contain exactly 5 hazard-linked V1 tasks';
    end if;
end;
$$;


/* -------------------------------------------------------------------------
 * 5. INSERT CANONICAL MISSION TASK DEFINITIONS
 * ------------------------------------------------------------------------- */

insert into public.mission_tasks (
    mission_id,
    hazard_id,
    code,
    title_en,
    title_ar,
    detail_en,
    detail_ar,
    points,
    sort_order,
    is_active
)
select
    mission.id,
    hazard.id,
    task.code,
    task.title_en,
    task.title_ar,
    task.detail_en,
    task.detail_ar,
    task.points,
    task.sort_order,
    true
from seed_preparedness_mission_tasks as task
join public.preparedness_missions as mission
    on mission.code = task.mission_code
left join public.hazards as hazard
    on hazard.code = task.hazard_code
order by
    mission.sort_order,
    task.sort_order;


/*
 * Final guard: every manifest row must map one-to-one to an active canonical
 * mission task with the expected mission/hazard relationship and content.
*/
do $$
begin
    if (
        select count(*)
        from public.mission_tasks as task
        join seed_preparedness_mission_tasks as seed
            on seed.code = task.code
        join public.preparedness_missions as mission
            on mission.id = task.mission_id
        left join public.hazards as hazard
            on hazard.id = task.hazard_id
        where mission.code = seed.mission_code
            and (
                (
                    seed.hazard_code is null
                    and task.hazard_id is null
                )
                or hazard.code = seed.hazard_code
            )
            and task.title_en = seed.title_en
            and task.title_ar = seed.title_ar
            and task.detail_en = seed.detail_en
            and task.detail_ar = seed.detail_ar
            and task.points = seed.points
            and task.sort_order = seed.sort_order
            and task.is_active
    ) <> 20 then
        raise exception
            'Preparedness task seed did not produce the expected 20 active task definitions';
    end if;
end;
$$;


commit;
