/*
 * Ihtiyat Resource Hub production content seed.
 *
 * This migration seeds the reviewed V1 Resource Hub catalogue only:
 *
 * - three user-facing topics;
 * - thirteen bilingual safety and emergency-reference resources;
 * - twenty-two checked official Saudi source references;
 * - topic relationships;
 * - hazard relationships.
 *
 * Mission-task and quiz relationships are deliberately seeded in later
 * migrations so each content layer remains independently testable.
 *
 * No resource_locations rows are inserted. V1 resources are national/general
 * or hazard-linked; the existing location-hazard resolver can later determine
 * which hazard resources receive local prominence.
 */

begin;


/* -------------------------------------------------------------------------
 * 1. CONTROLLED RESOURCE TOPIC MANIFEST
 * ------------------------------------------------------------------------- */

create temporary table seed_resource_topics (
    code text primary key,
    name_en text not null,
    name_ar text not null,
    description_en text not null,
    description_ar text not null,
    sort_order smallint not null
) on commit drop;


insert into seed_resource_topics (
    code,
    name_en,
    name_ar,
    description_en,
    description_ar,
    sort_order
)
values

    ('first_aid',
        'First Aid',
        'الإسعافات الأولية',
        'First-aid kit preparation and basic first-response learning.',
        'إعداد حقيبة الإسعافات الأولية والتعرّف على مبادئ الاستجابة الأولية.',
        10
    ),
    ('emergency_preparedness',
        'Emergency Preparedness',
        'الاستعداد للطوارئ',
        'General household readiness, emergency supplies, communication and official-warning awareness.',
        'الاستعداد المنزلي العام ومستلزمات الطوارئ والتواصل ومتابعة التحذيرات الرسمية.',
        20
    ),
    ('hazard_safety',
        'Hazard Safety',
        'السلامة من المخاطر',
        'Preparedness and response guidance for hazards represented in Ihtiyat.',
        'إرشادات الاستعداد والاستجابة للمخاطر الممثلة في تطبيق احتياط.',
        30
    );


insert into public.resource_topics (
    code,
    name_en,
    name_ar,
    description_en,
    description_ar,
    sort_order,
    is_active
)
select
    code,
    name_en,
    name_ar,
    description_en,
    description_ar,
    sort_order,
    true
from seed_resource_topics
order by sort_order;


/* -------------------------------------------------------------------------
 * 2. CONTROLLED PUBLISHED RESOURCE MANIFEST
 * ------------------------------------------------------------------------- */

create temporary table seed_safety_resources (
    code text primary key,
    title_en text not null,
    title_ar text not null,
    summary_en text not null,
    summary_ar text not null,
    content_en text not null,
    content_ar text not null,
    sort_order smallint not null
) on commit drop;


insert into seed_safety_resources (
    code,
    title_en,
    title_ar,
    summary_en,
    summary_ar,
    content_en,
    content_ar,
    sort_order
)
values

    ('first_aid_kit_basics',
        'First Aid Kit & Basic Injury Care',
        'حقيبة الإسعافات الأولية والعناية الأساسية بالإصابات',
        'Prepare and maintain a household first-aid kit, review basic first-aid principles, and use selected Saudi Ministry of Health injury-care guidance as further learning.',
        'جهّز حقيبة إسعافات أولية منزلية وحافظ على جاهزيتها، وراجع مبادئ الإسعافات الأولية الأساسية، واستفد من إرشادات مختارة للعناية بالإصابات من وزارة الصحة السعودية.',
        'This English guidance is an Ihtiyat-curated translation and summary of selected Arabic material published by the Saudi Ministry of Health (MOH) in Dose of Awareness 2 (printed pp. 85-91; PDF-viewer pp. 87-93). It is not an official MOH English translation.

Before an emergency:
• Keep a first-aid kit in a safe, dry, accessible place known to responsible household members.
• Review the kit after each use and at least once every 12 months.
• Learn how to use the kit contents before they are needed.
• The MOH kit illustration includes adhesive bandages, adhesive tape, a thermometer, sharp scissors, tweezers, plastic bags, sterile gauze, cold packs, plastic gloves, sterile eye wash and medical wipes.

For a minor cut or wound, the selected MOH guidance advises:
1. Clean the wound using water.
2. Control bleeding with a sterile dressing or clean cloth and apply pressure until it stops.
3. Change the dressing or adhesive covering when needed.

Seek medical assessment if:
• bleeding continues;
• there is a foreign object in the wound;
• the wound is deep or cannot be controlled;
• the person has diabetes or another relevant health condition; or
• there are signs of infection such as redness, swelling or increasing pain.

The selected excerpt also contains illustrated guidance for casts/fractures, stitches, head injuries and burns. These pages are provided as further learning, not as a substitute for diagnosis or professional medical care.

General first-aid principles:
• Check scene safety.
• Assess the injured or unwell person.
• Call emergency services when needed.
• Provide appropriate initial help within your knowledge.

During a real emergency, follow current MOH and emergency-service instructions.',
        'النسخة الإنجليزية في احتياط هي ترجمة وملخص أعدهما التطبيق اعتمادًا على مواد عربية مختارة نشرتها وزارة الصحة السعودية في كتاب «جرعة وعي 2» (الصفحات المطبوعة 85-91؛ والصفحات 87-93 في عارض ملف PDF). وهي ليست ترجمة إنجليزية رسمية صادرة عن وزارة الصحة.

قبل الطوارئ:
• احتفظ بحقيبة الإسعافات الأولية في مكان آمن وجاف وسهل الوصول يعرفه أفراد المنزل المسؤولون.
• راجع محتويات الحقيبة بعد كل استخدام ومرة واحدة على الأقل كل 12 شهرًا.
• تعلّم كيفية استخدام محتويات الحقيبة قبل الحاجة إليها.
• يتضمن الرسم التوضيحي لوزارة الصحة ضمادات وشريطًا لاصقًا ومقياس حرارة ومقصًا حادًا وملقاطًا وأكياسًا بلاستيكية وشاشًا معقمًا وكمادات باردة وقفازات بلاستيكية وغسولًا معقمًا للعين ومسحات طبية.

بالنسبة للخدوش أو الجروح البسيطة، توصي الإرشادات المختارة من وزارة الصحة بما يلي:
1. نظّف الجرح باستخدام الماء.
2. سيطر على النزيف باستخدام ضمادة معقمة أو قطعة قماش نظيفة واضغط على الجرح حتى يتوقف النزيف.
3. غيّر الضمادة أو اللاصق عند الحاجة.

اطلب تقييمًا طبيًا إذا:
• استمر النزيف؛
• وُجد جسم غريب في الجرح؛
• كان الجرح عميقًا أو تعذر التحكم به؛
• كان الشخص مصابًا بالسكري أو لديه حالة صحية أخرى ذات صلة؛ أو
• ظهرت علامات عدوى مثل الاحمرار أو التورم أو زيادة الألم.

يتضمن المقتطف المختار أيضًا إرشادات مصورة للعناية بالجبائر والكسور والغرز الجراحية وإصابات الرأس والحروق. تُقدَّم هذه الصفحات للتعلّم الإضافي وليست بديلًا عن التشخيص أو الرعاية الطبية المهنية.

مبادئ الإسعافات الأولية العامة:
• تأكد من سلامة المكان.
• قيّم حالة الشخص المصاب أو المريض.
• اطلب خدمات الطوارئ عند الحاجة.
• قدّم المساعدة الأولية المناسبة ضمن حدود معرفتك.

أثناء الطوارئ الحقيقية، اتبع تعليمات وزارة الصحة وخدمات الطوارئ الحالية.',
        10
    ),
    ('household_emergency_kit',
        'Household Emergency Kit',
        'حقيبة الطوارئ المنزلية',
        'Keep essential emergency supplies together and accessible, building on the first-aid kit prepared in Mission 1.',
        'احتفظ بمستلزمات الطوارئ الأساسية مجمعة وسهلة الوصول، مع الاستفادة من حقيبة الإسعافات الأولية التي أعددتها في المهمة الأولى.',
        'Keep essential household emergency supplies together in a known, accessible place.

Core supplies:
• Bottled water.
• Suitable non-perishable food.
• A battery-powered flashlight.
• Spare batteries.
• Necessary medicines.
• Important documents.
• The prepared first-aid kit from Mission 1.

Phone and backup power:
• Keep a phone charging cable and charging adapter ready.
• Keep at least one fully charged power bank available.
• If you use another suitable backup charging option, keep it charged and ready before it is needed.

Home-safety equipment:
• Smoke detector.
• Gas detector.
• Fire extinguisher.
• Fire blanket.

Review the supplies regularly and replace items that are missing, damaged or no longer suitable for use. Follow current official instructions during an emergency.',
        'احتفظ بمستلزمات الطوارئ المنزلية الأساسية مجمعة في مكان معروف وسهل الوصول.

المستلزمات الأساسية:
• مياه معبأة.
• أغذية مناسبة غير قابلة للتلف.
• كشاف يعمل بالبطارية.
• بطاريات إضافية.
• الأدوية الضرورية.
• الوثائق المهمة.
• حقيبة الإسعافات الأولية المجهزة في المهمة الأولى.

الهاتف والطاقة الاحتياطية:
• احتفظ بكابل شحن للهاتف ومحوّل شحن جاهزين.
• احتفظ ببطارية شحن متنقلة واحدة على الأقل مشحونة بالكامل.
• إذا كنت تستخدم وسيلة أخرى مناسبة للشحن الاحتياطي، فاحرص على أن تكون مشحونة وجاهزة قبل الحاجة إليها.

وسائل السلامة المنزلية:
• كاشف دخان.
• كاشف غاز.
• طفاية حريق.
• بطانية حريق.

راجع المستلزمات بانتظام واستبدل العناصر الناقصة أو التالفة أو التي لم تعد صالحة للاستخدام. واتبع التعليمات الرسمية الحالية أثناء الطوارئ.',
        20
    ),
    ('household_emergency_plan',
        'Household Communication & Emergency Plan',
        'خطة التواصل والطوارئ لأفراد المنزل',
        'Agree how household members will communicate, meet, leave safely and follow official warnings during an emergency.',
        'اتفق مسبقًا على كيفية تواصل أفراد المنزل ونقطة التجمع والخروج الآمن ومتابعة التحذيرات الرسمية أثناء الطوارئ.',
        'Prepare a simple household plan before an emergency.

Communication:
• Agree how household members will contact or check on one another if normal communication is disrupted.
• Choose a meeting point in case household members become separated.

Leaving safely:
• Review safe exits from the home.
• Identify household members who may need extra help.

Official information:
• Review the Official Saudi Emergency & Support Numbers resource in this Resource Hub.
• Follow the National Center for Meteorology (NCM) and Saudi Civil Defense for official warnings and instructions.
• Recheck current official information during a real emergency because service arrangements and instructions can change.

Ihtiyat supports access to preparedness information; it does not replace official warning or emergency services.',
        'أعدّ خطة منزلية بسيطة قبل الطوارئ.

التواصل:
• اتفق على كيفية تواصل أفراد المنزل أو الاطمئنان على بعضهم إذا تعطلت وسائل الاتصال المعتادة.
• حدّد نقطة تجمع في حال تفرّق أفراد المنزل.

الخروج الآمن:
• راجع مخارج المنزل الآمنة.
• حدّد أفراد المنزل الذين قد يحتاجون إلى مساعدة إضافية.

المعلومات الرسمية:
• راجع مورد «أرقام الطوارئ والدعم الرسمية في السعودية» داخل مركز الموارد.
• تابع المركز الوطني للأرصاد والدفاع المدني السعودي للحصول على التحذيرات والتعليمات الرسمية.
• أعد التحقق من المعلومات الرسمية الحالية أثناء الطوارئ الحقيقية لأن ترتيبات الخدمات والتعليمات قد تتغير.

يساعد احتياط في الوصول إلى معلومات الاستعداد، ولا يحل محل خدمات التحذير أو الطوارئ الرسمية.',
        30
    ),
    ('official_saudi_emergency_numbers',
        'Official Saudi Emergency & Support Numbers',
        'أرقام الطوارئ والدعم الرسمية في السعودية',
        'Keep key official Saudi emergency and health-support numbers accessible and verify current government guidance when an emergency occurs.',
        'احتفظ بأهم أرقام الطوارئ والدعم الصحي الرسمية في السعودية في مكان يسهل الوصول إليه، وتحقق من الإرشادات الحكومية الحالية عند وقوع طارئ.',
        'Use emergency numbers only when genuine assistance is needed.

Key official numbers:
1. 911 — Unified Emergency Number.
2. 997 — Saudi Red Crescent / ambulance.
3. 998 — Civil Defense.
4. 999 — Police.
5. 993 — Traffic accidents / General Traffic Department.
6. 996 — Road Security.
7. 112 — Kingdom emergency number listed by the National Platform for use without a SIM card.
8. 937 — Ministry of Health (MOH) 24/7 service for health enquiries, medical consultations and reports.

Important:
• The Communications, Space & Technology Commission (CST) National Numbering Plan confirms the main government emergency codes listed above.
• The National Platform provides the wider official emergency-contact directory, including 112.
• MOH confirms that 937 operates around the clock for health-related support.
• Check current official government information during an emergency because services and routing arrangements can change.

Ihtiyat displays these numbers for reference and does not place emergency calls automatically.',
        'استخدم أرقام الطوارئ فقط عند الحاجة الفعلية إلى المساعدة.

أهم الأرقام الرسمية:
1. 911 — رقم الطوارئ الموحد.
2. 997 — الهلال الأحمر السعودي / الإسعاف.
3. 998 — الدفاع المدني.
4. 999 — الشرطة.
5. 993 — حوادث المرور / الإدارة العامة للمرور.
6. 996 — أمن الطرق.
7. 112 — رقم طوارئ المملكة المدرج في المنصة الوطنية للاستخدام دون شريحة اتصال.
8. 937 — خدمة وزارة الصحة على مدار الساعة للاستفسارات الصحية والاستشارات الطبية وتلقي البلاغات.

مهم:
• تؤكد الخطة الوطنية للترقيم الصادرة عن هيئة الاتصالات والفضاء والتقنية رموز الطوارئ الحكومية الرئيسية الواردة أعلاه.
• توفر المنصة الوطنية دليلًا أوسع لأرقام التواصل الرسمية في حالات الطوارئ، بما في ذلك الرقم 112.
• تؤكد وزارة الصحة أن خدمة 937 تعمل على مدار الساعة للدعم المتعلق بالصحة.
• تحقق من المعلومات الحكومية الرسمية الحالية أثناء الطوارئ لأن الخدمات وآليات توجيه الاتصالات قد تتغير.

يعرض احتياط هذه الأرقام كمرجع ولا يجري مكالمات الطوارئ تلقائيًا.',
        40
    ),
    ('flood_safety',
        'Heavy Rain & Flash-Flood Safety',
        'السلامة من الأمطار الغزيرة والسيول',
        'Avoid valleys, low areas and floodwater, and follow official warnings during heavy rain and torrential flow.',
        'ابتعد عن الأودية والمناطق المنخفضة ومياه السيول، واتبع التحذيرات الرسمية أثناء الأمطار الغزيرة وجريان السيول.',
        'During heavy rain or torrential flow:
• Stay away from valleys, torrent streams, low areas and water accumulations.
• Do not take risks by attempting to cross floodwater or flowing valleys.
• Keep away from fallen or wet electrical wires and equipment.
• Follow official warnings, evacuation instructions and safe routes issued by the competent authorities.
• After the rain, continue to avoid water pools, valley streams and other areas where danger may remain.

Always prioritise current Saudi Civil Defense instructions over Resource Hub guidance.',
        'أثناء الأمطار الغزيرة أو جريان السيول:
• ابتعد عن الأودية ومجاري السيول والمناطق المنخفضة وتجمعات المياه.
• لا تجازف بمحاولة عبور مياه السيول أو الأودية الجارية.
• ابتعد عن الأسلاك والمعدات الكهربائية الساقطة أو المبتلة.
• اتبع التحذيرات وتعليمات الإخلاء والمسارات الآمنة الصادرة عن الجهات المختصة.
• بعد توقف المطر، استمر في تجنب تجمعات المياه ومجاري الأودية والمواقع التي قد يبقى فيها الخطر.

أعطِ دائمًا الأولوية لتعليمات الدفاع المدني السعودي الحالية على إرشادات مركز الموارد.',
        100
    ),
    ('extreme_heat_safety',
        'Extreme Heat & Heat-Stress Safety',
        'السلامة من الحر الشديد والإجهاد الحراري',
        'Reduce direct heat exposure, maintain fluids, rest and move to a cooler place when necessary.',
        'قلّل التعرض المباشر للحرارة، واحرص على السوائل والراحة والانتقال إلى مكان أبرد عند الحاجة.',
        'To reduce heat-related risk:
• Reduce unnecessary direct exposure to very high heat and sunlight.
• Drink sufficient fluids.
• Take regular rest.
• Prefer shaded or air-conditioned places when conditions are very hot.
• Avoid strenuous physical activity during very hot conditions when possible.

People who may be more vulnerable include:
• children;
• older adults; and
• people with chronic health conditions.

If concerning symptoms appear, follow current Saudi Ministry of Health guidance and seek appropriate medical help.',
        'للحد من المخاطر المرتبطة بالحر:
• قلّل التعرض المباشر غير الضروري للحرارة الشديدة وأشعة الشمس.
• احرص على شرب كمية كافية من السوائل.
• خذ فترات راحة منتظمة.
• انتقل إلى الأماكن المظللة أو المكيفة عندما تكون الأجواء شديدة الحرارة.
• تجنب النشاط البدني المجهد أثناء شدة الحرارة متى أمكن.

قد تشمل الفئات الأكثر عرضة:
• الأطفال؛
• كبار السن؛
• والأشخاص المصابين بأمراض مزمنة.

إذا ظهرت أعراض مقلقة، فاتبع إرشادات وزارة الصحة السعودية الحالية واطلب المساعدة الطبية المناسبة.',
        110
    ),
    ('dust_sandstorm_safety',
        'Dust, Sandstorm & Strong-Wind Safety',
        'السلامة من الغبار والعواصف الرملية والرياح الشديدة',
        'Reduce exposure to blowing dust, stay in a safe place when possible and use extra caution if travel is unavoidable.',
        'قلّل التعرض للغبار المتطاير، وابقَ في مكان آمن متى أمكن، وتوخَّ حذرًا إضافيًا إذا كان التنقل ضروريًا.',
        'During blowing dust or strong winds:
• Stay at home or in another safe indoor place unless going out is necessary.
• Close doors and windows tightly to reduce dust entering the building.
• If you must go outside, follow current Saudi Civil Defense protective guidance.
• If driving is unavoidable, keep vehicle windows closed.
• Use vehicle warning signals as directed.
• Leave sufficient distance from other vehicles.
• After the event, avoid fallen objects and dangling electrical wires.

Continue to follow official weather and Saudi Civil Defense updates.',
        'أثناء الغبار المتطاير أو الرياح الشديدة:
• ابقَ في المنزل أو في مكان داخلي آمن ما لم يكن الخروج ضروريًا.
• أغلق الأبواب والنوافذ بإحكام لتقليل دخول الغبار إلى المبنى.
• إذا اضطررت إلى الخروج فاتبع إرشادات الحماية الحالية للدفاع المدني السعودي.
• إذا كان لا بد من القيادة فأغلق نوافذ المركبة.
• استخدم إشارات التحذير وفق التعليمات.
• اترك مسافة كافية عن المركبات الأخرى.
• بعد انتهاء الحالة، تجنب الأجسام الساقطة والأسلاك الكهربائية المتدلية.

استمر في متابعة تحديثات الطقس والدفاع المدني السعودي الرسمية.',
        120
    ),
    ('earthquake_safety',
        'Earthquake Safety',
        'السلامة من الزلازل',
        'Know how to protect yourself from falling objects during shaking and what to do once the shaking stops.',
        'تعرّف على كيفية حماية نفسك من الأجسام الساقطة أثناء الاهتزاز وما يجب فعله بعد توقفه.',
        'If an earthquake begins while you are indoors:
• Remain calm.
• Take cover under a sturdy desk or table, or beside an interior wall when appropriate.
• Keep away from glass, windows, exterior walls and objects that may fall.
• Stay indoors until the shaking stops.
• Make sure it is safe before leaving.
• Do not use lifts during the event.

Afterwards, remain alert for additional hazards and follow official emergency information.',
        'إذا بدأ زلزال وأنت داخل مبنى:
• حافظ على هدوئك.
• احتمِ تحت مكتب أو طاولة متينة، أو بجوار جدار داخلي عندما يكون ذلك مناسبًا.
• ابتعد عن الزجاج والنوافذ والجدران الخارجية والأشياء التي قد تسقط.
• ابقَ داخل المبنى حتى يتوقف الاهتزاز.
• تأكد من أن الخروج آمن قبل المغادرة.
• لا تستخدم المصاعد أثناء الحدث.

بعد ذلك، ابقَ منتبهًا للمخاطر الإضافية واتبع معلومات الطوارئ الرسمية.',
        130
    ),
    ('landslide_rockfall_safety',
        'Landslide & Rockfall Safety',
        'السلامة من الانهيارات الأرضية وتساقط الصخور',
        'Use extra caution near mountain roads and slopes, especially during heavy rain, and avoid known rockfall or collapse areas.',
        'توخَّ حذرًا إضافيًا قرب الطرق الجبلية والمنحدرات، خصوصًا أثناء الأمطار الغزيرة، وتجنب المواقع المعرضة لتساقط الصخور أو الانهيار.',
        'Where rockfall or slope collapse is possible:
• Follow Saudi Civil Defense and other competent-authority instructions about dangerous roads.
• Avoid roads or areas identified as vulnerable to rockfall or collapse.
• Take extra care near mountains and mountain roads, particularly during rainfall and torrential flow.
• If a collapse or rockfall occurs, keep a safe distance.
• Do not approach merely to inspect the site.
• Inform the competent authorities when necessary.
• Follow their directions.',
        'عند احتمال تساقط الصخور أو انهيار المنحدرات:
• اتبع تعليمات الدفاع المدني السعودي والجهات المختصة بشأن الطرق الخطرة.
• تجنب الطرق أو المواقع المعروفة بقابليتها لتساقط الصخور أو الانهيار.
• توخَّ حذرًا إضافيًا قرب الجبال والطرق الجبلية، خصوصًا أثناء الأمطار وجريان السيول.
• إذا وقع انهيار أو تساقط للصخور فابتعد مسافة آمنة.
• لا تقترب لمجرد تفقد الموقع.
• أبلغ الجهات المختصة عند الحاجة.
• اتبع توجيهاتها.',
        140
    ),
    ('cold_wave_safety',
        'Cold-Wave Safety',
        'السلامة أثناء موجات البرد',
        'Keep homes warm safely, use heaters carefully and avoid unsafe indoor burning during low-temperature weather.',
        'حافظ على دفء المنزل بطريقة آمنة، واستخدم وسائل التدفئة بحذر، وتجنب إشعال النار بصورة غير آمنة داخل الأماكن المغلقة.',
        'During low-temperature weather:
• Keep the home warm using safe heating practices.
• Do not burn firewood in closed areas where fumes can accumulate.
• Maintain proper ventilation.
• Keep flammable materials away from heat sources.
• Check heaters and electrical wiring for safe condition.
• Follow official warnings and safety instructions as conditions change.',
        'أثناء انخفاض درجات الحرارة:
• حافظ على دفء المنزل باستخدام وسائل تدفئة آمنة.
• لا تشعل الحطب في الأماكن المغلقة التي قد تتجمع فيها الأبخرة والغازات.
• حافظ على التهوية المناسبة.
• أبعد المواد القابلة للاشتعال عن مصادر الحرارة.
• تحقق من سلامة المدافئ والأسلاك الكهربائية.
• اتبع التحذيرات وإرشادات السلامة الرسمية مع تغير الظروف.',
        150
    ),
    ('thunderstorm_lightning_strong_winds_safety',
        'Thunderstorm, Lightning & Strong-Wind Safety',
        'السلامة من العواصف الرعدية والبرق والرياح الشديدة',
        'Seek safe shelter, avoid exposed areas and metal structures, and follow official instructions during thunderstorms and strong winds.',
        'التمس مأوى آمنًا، وتجنب الأماكن المكشوفة والمنشآت المعدنية، واتبع التعليمات الرسمية أثناء العواصف الرعدية والرياح الشديدة.',
        'During thunderstorms, lightning or strong winds:
• Avoid open and exposed areas.
• Keep away from trees.
• Keep away from metal structures and other unsafe exposed locations.
• Seek shelter inside a suitable building or vehicle.
• Exercise extra caution when travelling.
• Exercise extra caution during outdoor activities.
• Follow all official warnings and instructions throughout the event.',
        'أثناء العواصف الرعدية أو البرق أو الرياح الشديدة:
• تجنب الأماكن المفتوحة والمكشوفة.
• ابتعد عن الأشجار.
• ابتعد عن المنشآت المعدنية والمواقع المكشوفة غير الآمنة.
• احتمِ داخل مبنى مناسب أو مركبة.
• توخَّ حذرًا إضافيًا عند التنقل.
• توخَّ حذرًا إضافيًا أثناء الأنشطة الخارجية.
• اتبع جميع التحذيرات والتعليمات الرسمية طوال الحالة.',
        160
    ),
    ('drought_water_scarcity_awareness',
        'Drought, Water Scarcity & Conservation',
        'الجفاف وشح المياه وترشيد الاستهلاك',
        'Understand Saudi water-scarcity challenges, use practical household conservation habits, and recognise the role of proactive drought resilience.',
        'تعرّف على تحديات شح المياه في المملكة، واتبع ممارسات منزلية عملية لترشيد الاستهلاك، وافهم أهمية الاستعداد الاستباقي للجفاف.',
        'Saudi context:
• The Ministry of Environment, Water and Agriculture (MEWA) National Water Strategy describes renewable water as extremely scarce.
• The strategy identifies pressure on limited non-renewable groundwater.
• National priorities include water-demand management.
• National priorities also include reducing losses and safeguarding water resources.

Practical household conservation:
• Do not leave a water tap running continuously while washing vegetables.
• Do not leave a water tap running continuously while washing dishes.
• Do not leave a water tap running continuously while brushing teeth.
• Repair or replace taps when there is a water leak.
• Reduce unnecessary water waste.
• Follow current official conservation guidance.

Drought resilience:
• MEWA Saudi Water Week 2026 material emphasises moving from reactive responses towards proactive drought preparedness.
• It highlights integrated water and land management.
• It highlights sustainable investment and policy.
• It highlights innovation.
• It highlights community participation.

Household conservation is one part of wider water stewardship and does not by itself resolve national water scarcity.',
        'السياق السعودي:
• تصف الاستراتيجية الوطنية للمياه التابعة لوزارة البيئة والمياه والزراعة المياه المتجددة بأنها شحيحة للغاية.
• تشير الاستراتيجية إلى الضغط على مخزون المياه الجوفية غير المتجددة المحدود.
• تشمل الأولويات الوطنية إدارة الطلب على المياه.
• تشمل الأولويات كذلك تقليل الفاقد والمحافظة على الموارد المائية.

ممارسات منزلية عملية لترشيد الاستهلاك:
• لا تترك صنبور المياه مفتوحًا باستمرار أثناء غسل الخضروات.
• لا تترك صنبور المياه مفتوحًا باستمرار أثناء غسل الأطباق.
• لا تترك صنبور المياه مفتوحًا باستمرار أثناء تنظيف الأسنان.
• أصلح الصنابير أو استبدلها عند وجود تسرب للمياه.
• قلّل الهدر غير الضروري للمياه.
• اتبع إرشادات الترشيد الرسمية الحالية.

القدرة على الصمود أمام الجفاف:
• تؤكد مواد أسبوع المياه السعودي 2026 الصادرة عن الوزارة أهمية الانتقال من الاستجابة التفاعلية إلى الاستعداد الاستباقي للجفاف.
• تبرز الإدارة المتكاملة للمياه والأراضي.
• تبرز الاستثمار المستدام والسياسات.
• تبرز الابتكار.
• تبرز مشاركة المجتمع.

يمثل ترشيد الاستهلاك المنزلي جزءًا من إدارة المياه بصورة أوسع، ولا يحل بمفرده مشكلة شح المياه على المستوى الوطني.',
        170
    ),
    ('wildfire_vegetation_fire_safety',
        'Wildfire & Vegetation-Fire Safety',
        'السلامة من حرائق الغابات والغطاء النباتي',
        'Use fire only in designated places and avoid open flames near vegetation, trees and dry grass.',
        'استخدم النار فقط في الأماكن المخصصة وتجنب اللهب المكشوف قرب الغطاء النباتي والأشجار والأعشاب الجافة.',
        'To reduce vegetation-fire risk:
• Light fires only in places designated for that purpose.
• Avoid open flames in parks.
• Avoid open flames in vegetation-cover areas.
• Avoid open flames near trees and dry grass.
• Follow current Saudi Civil Defense safety instructions and official announcements.
• If an emergency occurs, contact the appropriate emergency service.
• Keep away from the dangerous area.',
        'للحد من مخاطر حرائق الغطاء النباتي:
• أشعل النار فقط في المواقع المخصصة لذلك.
• تجنب اللهب المكشوف في المتنزهات.
• تجنب اللهب المكشوف في مناطق الغطاء النباتي.
• تجنب اللهب المكشوف قرب الأشجار والأعشاب الجافة.
• اتبع إرشادات السلامة والإعلانات الرسمية الحالية للدفاع المدني السعودي.
• عند وقوع حالة طارئة اتصل بخدمة الطوارئ المناسبة.
• ابتعد عن منطقة الخطر.',
        180
    );


insert into public.safety_resources (
    code,
    title_en,
    title_ar,
    summary_en,
    summary_ar,
    content_en,
    content_ar,
    publication_status,
    sort_order,
    last_reviewed_on,
    published_at
)
select
    code,
    title_en,
    title_ar,
    summary_en,
    summary_ar,
    content_en,
    content_ar,
    'published',
    sort_order,
    date '2026-09-22',
    timestamptz '2026-09-22 05:15:27+00'
from seed_safety_resources
order by sort_order;


/* -------------------------------------------------------------------------
 * 3. CHECKED OFFICIAL SOURCE MANIFEST
 * -------------------------------------------------------------------------
 *
 * source_language_code describes the language of the linked authority page.
 * It is metadata, not a visibility gate. The application should prefer a
 * source matching the interface language when available, then fall back to
 * other active official sources rather than hiding authoritative references.
 */

create temporary table seed_resource_sources (
    resource_code text not null,
    publisher_name_en text not null,
    publisher_name_ar text not null,
    source_title_en text not null,
    source_title_ar text not null,
    source_url text not null,
    source_language_code text not null,
    sort_order smallint not null,

    primary key (resource_code, source_url)
) on commit drop;


insert into seed_resource_sources (
    resource_code,
    publisher_name_en,
    publisher_name_ar,
    source_title_en,
    source_title_ar,
    source_url,
    source_language_code,
    sort_order
)
values

    ('first_aid_kit_basics',
        'Saudi Ministry of Health',
        'وزارة الصحة',
        'First Aid',
        'الإسعافات الأولية',
        'https://www.moh.gov.sa/en/awarenessplateform/firstaid/pages/default.aspx',
        'en',
        10
    ),
    ('first_aid_kit_basics',
        'Saudi Ministry of Health',
        'وزارة الصحة',
        'Dose of Awareness 2 — selected first-aid and injury-care guidance (printed pp. 85-91; PDF-viewer pp. 87-93)',
        'جرعة وعي 2 — إرشادات مختارة للإسعافات الأولية والعناية بالإصابات (الصفحات المطبوعة 85-91؛ وصفحات عارض PDF رقم 87-93)',
        'https://www.moh.gov.sa/Ministry/MediaCenter/Publications/Documents/Dose-fo-Awareness-2.pdf',
        'ar',
        20
    ),
    ('household_emergency_kit',
        'National Center for Meteorology',
        'المركز الوطني للأرصاد',
        'Test Early Warning',
        'اختبار الإنذار المبكر',
        'https://www.ncm.gov.sa/en/test-early-warning',
        'en',
        10
    ),
    ('household_emergency_kit',
        'General Directorate of Civil Defense',
        'المديرية العامة للدفاع المدني',
        'Civil Defense Stresses Importance of Home Safety Equipment',
        'الدفاع المدني يؤكد أهمية وسائل السلامة المنزلية',
        'https://998.gov.sa/en/Page/News/706/',
        'en',
        20
    ),
    ('household_emergency_plan',
        'National Center for Meteorology',
        'المركز الوطني للأرصاد',
        'Weather Early Warning System Saudi Arabia',
        'نظام الإنذار المبكر للطقس في المملكة العربية السعودية',
        'https://www.ncm.gov.sa/en/early-warning',
        'en',
        10
    ),
    ('household_emergency_plan',
        'General Directorate of Civil Defense',
        'المديرية العامة للدفاع المدني',
        'Civil Defense Continues Public Awareness Campaign on Heavy Rains Safety',
        'الدفاع المدني يواصل التوعية بإرشادات السلامة أثناء الأمطار الغزيرة',
        'https://998.gov.sa/en/Page/News/660/',
        'en',
        20
    ),
    ('official_saudi_emergency_numbers',
        'National Platform',
        'المنصة الوطنية',
        'Emergency Contact Numbers in the Kingdom of Saudi Arabia',
        'أرقام التواصل في حالات الطوارئ في المملكة العربية السعودية',
        'https://my.gov.sa/en/emergency-contact',
        'en',
        10
    ),
    ('official_saudi_emergency_numbers',
        'Communications, Space & Technology Commission',
        'هيئة الاتصالات والفضاء والتقنية',
        'National Numbering Plan — Government and Emergency Codes',
        'الخطة الوطنية للترقيم — الرموز الحكومية وأرقام الطوارئ',
        'https://www.cst.gov.sa/en/about/Numbering',
        'en',
        20
    ),
    ('official_saudi_emergency_numbers',
        'Communications, Space & Technology Commission',
        'هيئة الاتصالات والفضاء والتقنية',
        'National Numbering Plan — Government and Emergency Codes',
        'الخطة الوطنية للترقيم — الرموز الحكومية وأرقام الطوارئ',
        'https://www.cst.gov.sa/about/Numbering',
        'ar',
        30
    ),
    ('official_saudi_emergency_numbers',
        'Saudi Ministry of Health',
        'وزارة الصحة',
        '937 Services',
        'خدمات 937',
        'https://www.moh.gov.sa/en/937/pages/default.aspx',
        'en',
        40
    ),
    ('official_saudi_emergency_numbers',
        'Saudi Ministry of Health',
        'وزارة الصحة',
        '937 Services',
        'خدمات 937',
        'https://www.moh.gov.sa/937/pages/default.aspx',
        'ar',
        50
    ),
    ('flood_safety',
        'General Directorate of Civil Defense',
        'المديرية العامة للدفاع المدني',
        'Rain and Flood Hazards',
        'مخاطر الأمطار والسيول',
        'https://998.gov.sa/en/Page/Rains-and-flood-hazards/web/NaturalDisasters/',
        'en',
        10
    ),
    ('extreme_heat_safety',
        'Saudi Ministry of Health',
        'وزارة الصحة',
        'Injuries Resulting from Exposure to Sunlight',
        'الإصابات الناتجة عن التعرض لأشعة الشمس',
        'https://www.moh.gov.sa/en/healthawareness/educationalcontent/publichealth/pages/004.aspx',
        'en',
        10
    ),
    ('dust_sandstorm_safety',
        'General Directorate of Civil Defense',
        'المديرية العامة للدفاع المدني',
        'Wind and Hurricane Risks',
        'مخاطر الرياح والأعاصير',
        'https://998.gov.sa/English/NaturalDisasters/Pages/Wind-and-hurricane-risks.aspx',
        'en',
        10
    ),
    ('earthquake_safety',
        'General Directorate of Civil Defense',
        'المديرية العامة للدفاع المدني',
        'Earthquake Hazards',
        'مخاطر الزلازل',
        'https://998.gov.sa/en/Page/Earthquake-Hazards/web/NaturalDisasters/',
        'en',
        10
    ),
    ('landslide_rockfall_safety',
        'General Directorate of Civil Defense',
        'المديرية العامة للدفاع المدني',
        'Rock Falls and Collapse Hazards',
        'مخاطر تساقط الصخور والانهيارات',
        'https://998.gov.sa/en/Page/Rock-falls-and-collapse-hazards/web/NaturalDisasters/',
        'en',
        10
    ),
    ('cold_wave_safety',
        'General Directorate of Civil Defense',
        'المديرية العامة للدفاع المدني',
        'Civil Defense Continues to Raise Public Awareness of Cold Waves',
        'الدفاع المدني يواصل التوعية بمخاطر موجات البرد',
        'https://998.gov.sa/en/Page/News/668/',
        'en',
        10
    ),
    ('thunderstorm_lightning_strong_winds_safety',
        'General Directorate of Civil Defense',
        'المديرية العامة للدفاع المدني',
        'Civil Defense Continues Public Awareness Campaign on Thunderstorm Safety',
        'الدفاع المدني يواصل التوعية بإرشادات السلامة أثناء العواصف الرعدية',
        'https://998.gov.sa/en/Page/News/661/',
        'en',
        10
    ),
    ('drought_water_scarcity_awareness',
        'Ministry of Environment, Water and Agriculture',
        'وزارة البيئة والمياه والزراعة',
        'National Water Strategy',
        'الاستراتيجية الوطنية للمياه',
        'https://www.mewa.gov.sa/en/Ministry/Agencies/TheWaterAgency/Topics/Pages/Strategy.aspx',
        'en',
        10
    ),
    ('drought_water_scarcity_awareness',
        'Ministry of Environment, Water and Agriculture',
        'وزارة البيئة والمياه والزراعة',
        'How to Participate in Environment Week — Practical Water-Conservation Guidance',
        'كيفية المشاركة في أسبوع البيئة — إرشادات عملية لترشيد استهلاك المياه',
        'https://www.mewa.gov.sa/en/Ministry/Agencies/EnvironmentAgency/Topics/Pages/how-to-share.aspx',
        'en',
        20
    ),
    ('drought_water_scarcity_awareness',
        'Ministry of Environment, Water and Agriculture',
        'وزارة البيئة والمياه والزراعة',
        'Saudi Water Week Discusses Land & Drought Resilience',
        'أسبوع المياه السعودي يناقش مرونة الأراضي ومواجهة الجفاف',
        'https://www.mewa.gov.sa/en/MediaCenter/News/Pages/saudi-water-week-drought-resilience.aspx',
        'en',
        30
    ),
    ('wildfire_vegetation_fire_safety',
        'General Directorate of Civil Defense',
        'المديرية العامة للدفاع المدني',
        'Civil Defense Stresses Importance of Using Designated Fire Areas to Protect Lives and the Environment',
        'الدفاع المدني يؤكد أهمية إشعال النار في المواقع المخصصة حفاظًا على الأرواح والبيئة',
        'https://998.gov.sa/en/Page/News/708/',
        'en',
        10
    );


insert into public.resource_sources (
    resource_id,
    publisher_name_en,
    publisher_name_ar,
    source_title_en,
    source_title_ar,
    source_url,
    source_language_code,
    is_official,
    last_checked_on,
    sort_order,
    is_active
)
select
    resource.id,
    source.publisher_name_en,
    source.publisher_name_ar,
    source.source_title_en,
    source.source_title_ar,
    source.source_url,
    source.source_language_code,
    true,
    date '2026-09-22',
    source.sort_order,
    true
from seed_resource_sources as source
join public.safety_resources as resource
    on resource.code = source.resource_code
order by
    resource.sort_order,
    source.sort_order;


/* -------------------------------------------------------------------------
 * 4. TOPIC RELATIONSHIPS
 * ------------------------------------------------------------------------- */

create temporary table seed_resource_topic_links (
    resource_code text not null,
    topic_code text not null,
    is_primary boolean not null,
    sort_order smallint not null,

    primary key (resource_code, topic_code)
) on commit drop;


insert into seed_resource_topic_links (
    resource_code,
    topic_code,
    is_primary,
    sort_order
)
values

    ('first_aid_kit_basics',
        'first_aid',
        true,
        10
    ),
    ('first_aid_kit_basics',
        'emergency_preparedness',
        false,
        20
    ),
    ('household_emergency_kit',
        'emergency_preparedness',
        true,
        10
    ),
    ('household_emergency_plan',
        'emergency_preparedness',
        true,
        20
    ),
    ('official_saudi_emergency_numbers',
        'emergency_preparedness',
        true,
        30
    ),
    ('flood_safety',
        'hazard_safety',
        true,
        100
    ),
    ('extreme_heat_safety',
        'hazard_safety',
        true,
        110
    ),
    ('dust_sandstorm_safety',
        'hazard_safety',
        true,
        120
    ),
    ('earthquake_safety',
        'hazard_safety',
        true,
        130
    ),
    ('landslide_rockfall_safety',
        'hazard_safety',
        true,
        140
    ),
    ('cold_wave_safety',
        'hazard_safety',
        true,
        150
    ),
    ('thunderstorm_lightning_strong_winds_safety',
        'hazard_safety',
        true,
        160
    ),
    ('drought_water_scarcity_awareness',
        'hazard_safety',
        true,
        170
    ),
    ('wildfire_vegetation_fire_safety',
        'hazard_safety',
        true,
        180
    );


insert into public.resource_topic_links (
    resource_id,
    topic_id,
    is_primary,
    sort_order
)
select
    resource.id,
    topic.id,
    link.is_primary,
    link.sort_order
from seed_resource_topic_links as link
join public.safety_resources as resource
    on resource.code = link.resource_code
join public.resource_topics as topic
    on topic.code = link.topic_code
order by
    resource.sort_order,
    link.sort_order;


/* -------------------------------------------------------------------------
 * 5. HAZARD RELATIONSHIPS
 * ------------------------------------------------------------------------- */

create temporary table seed_resource_hazards (
    resource_code text primary key,
    hazard_code text not null
) on commit drop;


insert into seed_resource_hazards (
    resource_code,
    hazard_code
)
values

    ('flood_safety', 'heavy_rain_flash_flooding'),
    ('extreme_heat_safety', 'extreme_heat_heatwave'),
    ('dust_sandstorm_safety', 'dust_sandstorm'),
    ('earthquake_safety', 'earthquake'),
    ('landslide_rockfall_safety', 'landslide_rockfall'),
    ('cold_wave_safety', 'cold_wave'),
    ('thunderstorm_lightning_strong_winds_safety', 'thunderstorm_lightning_strong_winds'),
    ('drought_water_scarcity_awareness', 'drought_water_scarcity'),
    ('wildfire_vegetation_fire_safety', 'wildfire_vegetation_fire');


insert into public.resource_hazards (
    resource_id,
    hazard_id
)
select
    resource.id,
    hazard.id
from seed_resource_hazards as link
join public.safety_resources as resource
    on resource.code = link.resource_code
join public.hazards as hazard
    on hazard.code = link.hazard_code
order by resource.sort_order;


/* -------------------------------------------------------------------------
 * 6. MANIFEST AND RELATIONSHIP VALIDATION
 * ------------------------------------------------------------------------- */

do $$
begin
    if (
        select count(*)
        from seed_resource_topics
    ) <> 3 then
        raise exception
            'Resource Hub topic seed manifest must contain exactly 3 rows';
    end if;

    if (
        select count(*)
        from seed_safety_resources
    ) <> 13 then
        raise exception
            'Resource Hub resource seed manifest must contain exactly 13 rows';
    end if;

    if (
        select count(*)
        from seed_resource_sources
    ) <> 22 then
        raise exception
            'Resource Hub source seed manifest must contain exactly 22 rows';
    end if;

    if (
        select count(*)
        from seed_resource_topic_links
    ) <> 14 then
        raise exception
            'Resource Hub topic-link seed manifest must contain exactly 14 rows';
    end if;

    if (
        select count(*)
        from seed_resource_topic_links
        where is_primary
    ) <> 13 then
        raise exception
            'Every seeded Resource Hub article must have exactly one primary topic';
    end if;

    if (
        select count(*)
        from seed_resource_hazards
    ) <> 9 then
        raise exception
            'Resource Hub hazard seed manifest must contain exactly 9 rows';
    end if;

    if exists (
        select 1
        from seed_resource_sources as source
        left join public.supported_languages as language
            on language.code = source.source_language_code
        where language.code is null
    ) then
        raise exception
            'Resource Hub source seed references an unsupported language code';
    end if;

    if exists (
        select 1
        from seed_resource_hazards as link
        left join public.hazards as hazard
            on hazard.code = link.hazard_code
        where hazard.id is null
            or not hazard.is_active
    ) then
        raise exception
            'Resource Hub hazard seed references a missing or inactive hazard';
    end if;

    if exists (
        select 1
        from seed_safety_resources as seed
        left join public.safety_resources as resource
            on resource.code = seed.code
        where resource.id is null
            or resource.publication_status <> 'published'
            or resource.last_reviewed_on <> date '2026-09-22'
            or resource.published_at is null
    ) then
        raise exception
            'Resource Hub seed did not produce the expected published resources';
    end if;

    if exists (
        select 1
        from seed_safety_resources as seed
        where not exists (
            select 1
            from public.resource_sources as source
            join public.safety_resources as resource
                on resource.id = source.resource_id
            where resource.code = seed.code
                and source.is_active
                and source.is_official
        )
    ) then
        raise exception
            'Every seeded Resource Hub article must have at least one active official source';
    end if;

    if exists (
        select 1
        from seed_safety_resources as seed
        where (
            select count(*)
            from public.resource_topic_links as link
            join public.safety_resources as resource
                on resource.id = link.resource_id
            where resource.code = seed.code
                and link.is_primary
        ) <> 1
    ) then
        raise exception
            'Every seeded Resource Hub article must have exactly one canonical primary topic';
    end if;
end;
$$;


/*
 * No resource_locations rows are seeded in V1.
 *
 * The content in this migration is either general/national or hazard-linked.
 * Location-specific prominence is resolved later from the active location and
 * the existing location-hazard catalogue rather than by duplicating articles.
 */

commit;
