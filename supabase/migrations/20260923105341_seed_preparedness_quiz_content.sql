/*
 * Ihtiyat preparedness quiz production content seed.
 *
 * This migration seeds nine bilingual V1 learning questions and thirty-six
 * answer options. The content is derived from the reviewed V1 Resource Hub
 * guidance seeded in 20260923051527_seed_resource_hub_content.sql.
 *
 * Scope:
 * - one first-aid learning question;
 * - five adaptive hazard questions;
 * - one official-warning / authority-awareness question;
 * - two official Saudi emergency/support-number questions.
 *
 * Quiz-to-Resource-Hub relationships are deliberately seeded in a later
 * migration through public.quiz_question_resources so content seeding and
 * relationship seeding remain independently testable.
*/

begin;

create temporary table seed_preparedness_quiz_questions (
    mission_code text not null,
    hazard_code text,
    code text primary key,
    question_type text not null,
    prompt_en text not null,
    prompt_ar text not null,
    explanation_en text not null,
    explanation_ar text not null,
    sort_order smallint not null,

    constraint seed_preparedness_quiz_questions_mission_code_format
        check (mission_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),

    constraint seed_preparedness_quiz_questions_hazard_code_format
        check (
            hazard_code is null
            or hazard_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
        ),

    constraint seed_preparedness_quiz_questions_code_format
        check (code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),

    constraint seed_preparedness_quiz_questions_type_valid
        check (question_type in ('single_select', 'multi_select')),

    constraint seed_preparedness_quiz_questions_sort_order_non_negative
        check (sort_order >= 0),

    constraint seed_preparedness_quiz_questions_order_unique
        unique (mission_code, sort_order)
) on commit drop;

insert into seed_preparedness_quiz_questions (
    mission_code, 
    hazard_code, 
    code, 
    question_type,
    prompt_en, 
    prompt_ar, 
    explanation_en, 
    explanation_ar, 
    sort_order
)
values
(
    'prepare_first_aid_kit',
    null,
    'quiz_first_aid_initial_response',
    'single_select',
    'Before giving first aid to an injured or unwell person, what should you check first?',
    'قبل تقديم الإسعافات الأولية لشخص مصاب أو مريض، ما الذي ينبغي التحقق منه أولًا؟',
    'Check scene safety first. Then assess the injured or unwell person, call emergency services when needed, and provide appropriate initial help within your knowledge.',
    'تحقق أولًا من سلامة المكان. بعد ذلك قيّم حالة الشخص المصاب أو المريض، واطلب خدمات الطوارئ عند الحاجة، وقدّم المساعدة الأولية المناسبة ضمن حدود معرفتك.',
    10
),
(
    'household_communication_readiness',
    null,
    'quiz_official_warning_authority',
    'single_select',
    'An official National Center for Meteorology weather warning is active for your area. How should Ihtiyat be used?',
    'يوجد تحذير جوي رسمي صادر عن المركز الوطني للأرصاد لمنطقتك. كيف ينبغي استخدام تطبيق احتياط؟',
    'Ihtiyat provides supporting preparedness guidance. Current official National Center for Meteorology and Saudi Civil Defense warnings and instructions remain authoritative during a real event.',
    'يقدم تطبيق احتياط إرشادات داعمة للاستعداد. وتظل التحذيرات والتعليمات الحالية الصادرة عن المركز الوطني للأرصاد والدفاع المدني السعودي هي المرجع الرسمي أثناء الحدث الحقيقي.',
    10
),
(
    'household_communication_readiness',
    null,
    'quiz_ambulance_number',
    'single_select',
    'Which official Saudi number is associated with the Saudi Red Crescent / ambulance service?',
    'ما الرقم الرسمي في السعودية المرتبط بخدمة الهلال الأحمر السعودي / الإسعاف؟',
    '997 is the official number listed for the Saudi Red Crescent / ambulance service. Check current official government information when an emergency occurs because service arrangements can change.',
    'الرقم 997 هو الرقم الرسمي المدرج لخدمة الهلال الأحمر السعودي / الإسعاف. تحقق من المعلومات الحكومية الرسمية الحالية عند وقوع طارئ لأن ترتيبات الخدمات قد تتغير.',
    20
),
(
    'household_communication_readiness',
    null,
    'quiz_moh_937',
    'single_select',
    'Which official number is the Saudi Ministry of Health 24/7 service for health enquiries, medical consultations and reports?',
    'ما الرقم الرسمي لخدمة وزارة الصحة السعودية التي تعمل على مدار الساعة للاستفسارات الصحية والاستشارات الطبية وتلقي البلاغات؟',
    '937 is the Saudi Ministry of Health 24/7 service for health enquiries, medical consultations and reports. It is distinct from the Saudi Red Crescent / ambulance number.',
    'الرقم 937 هو خدمة وزارة الصحة السعودية التي تعمل على مدار الساعة للاستفسارات الصحية والاستشارات الطبية وتلقي البلاغات، وهو يختلف عن رقم الهلال الأحمر السعودي / الإسعاف.',
    30
),
(
    'know_your_local_hazards',
    'heavy_rain_flash_flooding',
    'quiz_flood_avoid_water',
    'multi_select',
    'During heavy rain or torrential flow, which TWO actions match the reviewed flood-safety guidance? Select two.',
    'أثناء الأمطار الغزيرة أو جريان السيول، أي إجراءين يتوافقان مع إرشادات السلامة من السيول المراجعة؟ اختر إجابتين.',
    'Stay away from valleys, torrent streams, low areas and water accumulations, and keep away from fallen or wet electrical wires and equipment. Do not attempt to cross floodwater or flowing valleys.',
    'ابتعد عن الأودية ومجاري السيول والمناطق المنخفضة وتجمعات المياه، وابتعد عن الأسلاك والمعدات الكهربائية الساقطة أو المبتلة. ولا تحاول عبور مياه السيول أو الأودية الجارية.',
    10
),
(
    'know_your_local_hazards',
    'extreme_heat_heatwave',
    'quiz_heat_reduce_exposure',
    'single_select',
    'During very hot conditions, which action best matches the reviewed heat-safety guidance?',
    'أثناء الأجواء شديدة الحرارة، أي إجراء يتوافق أكثر مع إرشادات السلامة من الحر المراجعة؟',
    'Reduce unnecessary direct heat exposure, drink sufficient fluids, take regular rest, and move to a shaded or air-conditioned place when conditions are very hot.',
    'قلّل التعرض المباشر غير الضروري للحرارة، واشرب كمية كافية من السوائل، وخذ فترات راحة منتظمة، وانتقل إلى مكان مظلل أو مكيف عندما تكون الأجواء شديدة الحرارة.',
    20
),
(
    'know_your_local_hazards',
    'dust_sandstorm',
    'quiz_dust_shelter',
    'single_select',
    'During blowing dust or strong winds, which action best matches the reviewed safety guidance?',
    'أثناء الغبار المتطاير أو الرياح الشديدة، أي إجراء يتوافق أكثر مع إرشادات السلامة المراجعة؟',
    'Stay at home or in another safe indoor place when possible and close doors and windows tightly to reduce dust entering the building.',
    'ابقَ في المنزل أو في مكان داخلي آمن متى أمكن، وأغلق الأبواب والنوافذ بإحكام لتقليل دخول الغبار إلى المبنى.',
    30
),
(
    'know_your_local_hazards',
    'earthquake',
    'quiz_earthquake_indoor_cover',
    'single_select',
    'If an earthquake begins while you are indoors, what should you do during the shaking?',
    'إذا بدأ زلزال وأنت داخل مبنى، ماذا ينبغي أن تفعل أثناء الاهتزاز؟',
    'Take cover under a sturdy desk or table, or beside an interior wall when appropriate, and keep away from glass, windows, exterior walls and objects that may fall. Do not use lifts during the event.',
    'احتمِ تحت مكتب أو طاولة متينة، أو بجوار جدار داخلي عندما يكون ذلك مناسبًا، وابتعد عن الزجاج والنوافذ والجدران الخارجية والأشياء التي قد تسقط. ولا تستخدم المصاعد أثناء الحدث.',
    40
),
(
    'know_your_local_hazards',
    'landslide_rockfall',
    'quiz_rockfall_mountain_road',
    'single_select',
    'During heavy rain, you are near a mountain road known to be vulnerable to rockfall or slope collapse. What should you do?',
    'أثناء أمطار غزيرة، أنت بالقرب من طريق جبلي معروف بقابليته لتساقط الصخور أو انهيار المنحدرات. ماذا ينبغي أن تفعل؟',
    'Avoid roads or areas identified as vulnerable to rockfall or collapse, keep a safe distance from dangerous sites, and follow Saudi Civil Defense or other competent-authority instructions.',
    'تجنب الطرق أو المواقع المعروفة بقابليتها لتساقط الصخور أو الانهيار، وابتعد مسافة آمنة عن المواقع الخطرة، واتبع تعليمات الدفاع المدني السعودي أو الجهات المختصة.',
    50
);

create temporary table seed_preparedness_quiz_options (
    question_code text not null,
    option_code text not null,
    text_en text not null,
    text_ar text not null,
    is_correct boolean not null,
    sort_order smallint not null,

    primary key (question_code, option_code),

    constraint seed_preparedness_quiz_options_question_code_format
        check (question_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),

    constraint seed_preparedness_quiz_options_option_code_format
        check (option_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),

    constraint seed_preparedness_quiz_options_sort_order_non_negative
        check (sort_order >= 0),

    constraint seed_preparedness_quiz_options_order_unique
        unique (question_code, sort_order)
) on commit drop;

insert into seed_preparedness_quiz_options (
    question_code, option_code, text_en, text_ar, is_correct, sort_order
)
values
('quiz_first_aid_initial_response','check_scene_safety',
 'Check that the scene is safe.','تحقق من أن المكان آمن.',true,10),
('quiz_first_aid_initial_response','check_documents',
 'Check whether important household documents are ready.','تحقق مما إذا كانت الوثائق المنزلية المهمة جاهزة.',false,20),
('quiz_first_aid_initial_response','check_power_bank',
 'Check whether a household power bank is fully charged.','تحقق مما إذا كانت بطارية الشحن المتنقلة المنزلية مشحونة بالكامل.',false,30),
('quiz_first_aid_initial_response','close_windows_for_dust',
 'Close doors and windows tightly to reduce dust entering the building.','أغلق الأبواب والنوافذ بإحكام لتقليل دخول الغبار إلى المبنى.',false,40),

('quiz_official_warning_authority','support_official_guidance',
 'Use Ihtiyat as supporting guidance while following current official National Center for Meteorology and Saudi Civil Defense instructions.',
 'استخدم احتياط كإرشاد داعم مع اتباع التعليمات الحالية الرسمية للمركز الوطني للأرصاد والدفاع المدني السعودي.',true,10),
('quiz_official_warning_authority','replace_official_warning',
 'Treat Ihtiyat as a replacement for official warning and emergency services.',
 'اعتبر احتياط بديلًا عن خدمات التحذير والطوارئ الرسمية.',false,20),
('quiz_official_warning_authority','prefer_cached_article',
 'Ignore a current official instruction if an older cached Ihtiyat article says something different.',
 'تجاهل التعليمات الرسمية الحالية إذا كان مقال أقدم مخزن في احتياط يقول شيئًا مختلفًا.',false,30),
('quiz_official_warning_authority','wait_for_social_confirmation',
 'Wait for an unofficial social-media post before acting on the official warning.',
 'انتظر منشورًا غير رسمي على وسائل التواصل الاجتماعي قبل الاستجابة للتحذير الرسمي.',false,40),

('quiz_ambulance_number','number_997','997','997',true,10),
('quiz_ambulance_number','number_998','998','998',false,20),
('quiz_ambulance_number','number_999','999','999',false,30),
('quiz_ambulance_number','number_937','937','937',false,40),

('quiz_moh_937','number_937','937','937',true,10),
('quiz_moh_937','number_997','997','997',false,20),
('quiz_moh_937','number_998','998','998',false,30),
('quiz_moh_937','number_999','999','999',false,40),

('quiz_flood_avoid_water','avoid_valleys_and_floodwater',
 'Stay away from valleys, torrent streams, low areas and water accumulations.',
 'ابتعد عن الأودية ومجاري السيول والمناطق المنخفضة وتجمعات المياه.',true,10),
('quiz_flood_avoid_water','avoid_wet_electrical_hazards',
 'Keep away from fallen or wet electrical wires and equipment.',
 'ابتعد عن الأسلاك والمعدات الكهربائية الساقطة أو المبتلة.',true,20),
('quiz_flood_avoid_water','earthquake_cover',
 'Take cover under a sturdy desk or table during shaking.',
 'احتمِ تحت مكتب أو طاولة متينة أثناء الاهتزاز.',false,30),
('quiz_flood_avoid_water','dust_window_control',
 'Close doors and windows tightly to reduce dust entering the building.',
 'أغلق الأبواب والنوافذ بإحكام لتقليل دخول الغبار إلى المبنى.',false,40),

('quiz_heat_reduce_exposure','reduce_heat_exposure',
 'Reduce direct heat exposure, drink sufficient fluids and take regular rest in a cooler place.',
 'قلّل التعرض المباشر للحرارة، واشرب كمية كافية من السوائل، وخذ فترات راحة منتظمة في مكان أبرد.',true,10),
('quiz_heat_reduce_exposure','earthquake_cover',
 'Take cover under a sturdy desk or table until shaking stops.',
 'احتمِ تحت مكتب أو طاولة متينة حتى يتوقف الاهتزاز.',false,20),
('quiz_heat_reduce_exposure','dust_window_control',
 'Close doors and windows tightly to reduce dust entering the building.',
 'أغلق الأبواب والنوافذ بإحكام لتقليل دخول الغبار إلى المبنى.',false,30),
('quiz_heat_reduce_exposure','avoid_rockfall_road',
 'Avoid roads or areas identified as vulnerable to rockfall or collapse.',
 'تجنب الطرق أو المواقع المعروفة بقابليتها لتساقط الصخور أو الانهيار.',false,40),

('quiz_dust_shelter','safe_indoor_shelter',
 'Stay in a safe indoor place when possible and close doors and windows tightly.',
 'ابقَ في مكان داخلي آمن متى أمكن وأغلق الأبواب والنوافذ بإحكام.',true,10),
('quiz_dust_shelter','heat_hydration',
 'Reduce direct heat exposure, drink sufficient fluids and take regular rest.',
 'قلّل التعرض المباشر للحرارة واشرب كمية كافية من السوائل وخذ فترات راحة منتظمة.',false,20),
('quiz_dust_shelter','earthquake_cover',
 'Take cover under a sturdy desk or table during shaking.',
 'احتمِ تحت مكتب أو طاولة متينة أثناء الاهتزاز.',false,30),
('quiz_dust_shelter','avoid_rockfall_road',
 'Avoid roads or areas identified as vulnerable to rockfall or collapse.',
 'تجنب الطرق أو المواقع المعروفة بقابليتها لتساقط الصخور أو الانهيار.',false,40),

('quiz_earthquake_indoor_cover','take_indoor_cover',
 'Take cover under a sturdy desk or table, or beside an interior wall when appropriate, and stay away from glass and objects that may fall.',
 'احتمِ تحت مكتب أو طاولة متينة، أو بجوار جدار داخلي عندما يكون ذلك مناسبًا، وابتعد عن الزجاج والأشياء التي قد تسقط.',true,10),
('quiz_earthquake_indoor_cover','dust_window_control',
 'Close doors and windows tightly to reduce dust entering the building.',
 'أغلق الأبواب والنوافذ بإحكام لتقليل دخول الغبار إلى المبنى.',false,20),
('quiz_earthquake_indoor_cover','heat_hydration',
 'Move to a cooler place, drink sufficient fluids and take regular rest.',
 'انتقل إلى مكان أبرد واشرب كمية كافية من السوائل وخذ فترات راحة منتظمة.',false,30),
('quiz_earthquake_indoor_cover','avoid_rockfall_road',
 'Avoid roads or areas identified as vulnerable to rockfall or collapse.',
 'تجنب الطرق أو المواقع المعروفة بقابليتها لتساقط الصخور أو الانهيار.',false,40),

('quiz_rockfall_mountain_road','avoid_vulnerable_road',
 'Avoid the vulnerable road or area, keep a safe distance and follow competent-authority instructions.',
 'تجنب الطريق أو المنطقة المعرضة للخطر، وابتعد مسافة آمنة، واتبع تعليمات الجهات المختصة.',true,10),
('quiz_rockfall_mountain_road','heat_hydration',
 'Move to a cooler place, drink sufficient fluids and take regular rest.',
 'انتقل إلى مكان أبرد واشرب كمية كافية من السوائل وخذ فترات راحة منتظمة.',false,20),
('quiz_rockfall_mountain_road','dust_window_control',
 'Close doors and windows tightly to reduce dust entering the building.',
 'أغلق الأبواب والنوافذ بإحكام لتقليل دخول الغبار إلى المبنى.',false,30),
('quiz_rockfall_mountain_road','earthquake_cover',
 'Take cover under a sturdy desk or table during shaking.',
 'احتمِ تحت مكتب أو طاولة متينة أثناء الاهتزاز.',false,40);


do $$
begin
    if (select count(*) from seed_preparedness_quiz_questions) <> 9 then
        raise exception 'Preparedness quiz question seed manifest must contain exactly 9 rows';
    end if;

    if (select count(*) from seed_preparedness_quiz_options) <> 36 then
        raise exception 'Preparedness quiz option seed manifest must contain exactly 36 rows';
    end if;

    if (
        select count(*)
        from seed_preparedness_quiz_questions
        where question_type = 'single_select'
    ) <> 8 then
        raise exception 'Preparedness quiz seed must contain exactly 8 single-select questions';
    end if;

    if (
        select count(*)
        from seed_preparedness_quiz_questions
        where question_type = 'multi_select'
    ) <> 1 then
        raise exception 'Preparedness quiz seed must contain exactly 1 multi-select question';
    end if;

    if exists (
        select 1
        from seed_preparedness_quiz_questions as question
        left join public.preparedness_missions as mission
            on mission.code = question.mission_code
        where mission.id is null or not mission.is_active
    ) then
        raise exception 'Preparedness quiz seed references a missing or inactive mission';
    end if;

    if exists (
        select 1
        from seed_preparedness_quiz_questions as question
        left join public.hazards as hazard
            on hazard.code = question.hazard_code
        where question.hazard_code is not null
          and (hazard.id is null or not hazard.is_active)
    ) then
        raise exception 'Preparedness quiz seed references a missing or inactive hazard';
    end if;

    if exists (
        select 1
        from seed_preparedness_quiz_questions
        where mission_code <> 'know_your_local_hazards'
          and hazard_code is not null
    ) then
        raise exception 'Only adaptive local-hazard quiz questions may be hazard-linked in V1';
    end if;

    if (
        select count(*)
        from seed_preparedness_quiz_questions
        where mission_code = 'know_your_local_hazards'
          and hazard_code is not null
    ) <> 5 then
        raise exception 'Adaptive local-hazard quiz must contain exactly 5 hazard-linked V1 questions';
    end if;

    if exists (
        select 1
        from seed_preparedness_quiz_options as option
        left join seed_preparedness_quiz_questions as question
            on question.code = option.question_code
        where question.code is null
    ) then
        raise exception 'Preparedness quiz option seed references an unknown question';
    end if;

    if exists (
        select 1
        from seed_preparedness_quiz_questions as question
        left join seed_preparedness_quiz_options as option
            on option.question_code = question.code
        group by question.code, question.question_type
        having count(option.option_code) <> 4
    ) then
        raise exception 'Every V1 preparedness quiz question must contain exactly 4 options';
    end if;

    if exists (
        select 1
        from seed_preparedness_quiz_questions as question
        join seed_preparedness_quiz_options as option
            on option.question_code = question.code
        where question.question_type = 'single_select'
        group by question.code
        having count(*) filter (where option.is_correct) <> 1
    ) then
        raise exception 'Every single-select V1 quiz question must contain exactly 1 correct option';
    end if;

    if exists (
        select 1
        from seed_preparedness_quiz_questions as question
        join seed_preparedness_quiz_options as option
            on option.question_code = question.code
        where question.question_type = 'multi_select'
        group by question.code
        having count(*) filter (where option.is_correct) <> 2
    ) then
        raise exception 'The V1 multi-select quiz question must contain exactly 2 correct options';
    end if;
end;
$$;

insert into public.quiz_questions (
    mission_id, 
    hazard_id, 
    code, 
    question_type,
    prompt_en, 
    prompt_ar, 
    explanation_en, 
    explanation_ar,
    sort_order, 
    is_active
)
select
    mission.id,
    hazard.id,
    question.code,
    question.question_type,
    question.prompt_en,
    question.prompt_ar,
    question.explanation_en,
    question.explanation_ar,
    question.sort_order,
    true
from seed_preparedness_quiz_questions as question
join public.preparedness_missions as mission
    on mission.code = question.mission_code
left join public.hazards as hazard
    on hazard.code = question.hazard_code
order by mission.sort_order, question.sort_order;

insert into public.quiz_options (
    question_id, 
    option_code, 
    text_en, 
    text_ar, 
    is_correct, 
    sort_order
)
select
    question.id,
    option.option_code,
    option.text_en,
    option.text_ar,
    option.is_correct,
    option.sort_order
from seed_preparedness_quiz_options as option
join public.quiz_questions as question
    on question.code = option.question_code
order by question.id, option.sort_order;

do $$
begin
    if (
        select count(*)
        from public.quiz_questions as question
        join seed_preparedness_quiz_questions as seed
            on seed.code = question.code
        join public.preparedness_missions as mission
            on mission.id = question.mission_id
        left join public.hazards as hazard
            on hazard.id = question.hazard_id
        where mission.code = seed.mission_code
          and (
                (seed.hazard_code is null and question.hazard_id is null)
                or hazard.code = seed.hazard_code
          )
          and question.question_type = seed.question_type
          and question.prompt_en = seed.prompt_en
          and question.prompt_ar = seed.prompt_ar
          and question.explanation_en = seed.explanation_en
          and question.explanation_ar = seed.explanation_ar
          and question.sort_order = seed.sort_order
          and question.is_active
    ) <> 9 then
        raise exception 'Preparedness quiz seed did not produce the expected 9 active question definitions';
    end if;

    if (
        select count(*)
        from public.quiz_options as option
        join public.quiz_questions as question
            on question.id = option.question_id
        join seed_preparedness_quiz_options as seed
            on seed.question_code = question.code
           and seed.option_code = option.option_code
        where option.text_en = seed.text_en
          and option.text_ar = seed.text_ar
          and option.is_correct = seed.is_correct
          and option.sort_order = seed.sort_order
    ) <> 36 then
        raise exception 'Preparedness quiz seed did not produce the expected 36 option definitions';
    end if;

    if (
        select count(*)
        from public.quiz_options as option
        join public.quiz_questions as question
            on question.id = option.question_id
        join seed_preparedness_quiz_questions as seed
            on seed.code = question.code
        where option.is_correct
    ) <> 10 then
        raise exception 'Preparedness quiz seed must contain exactly 10 correct option rows across 9 questions';
    end if;
end;
$$;

commit;
