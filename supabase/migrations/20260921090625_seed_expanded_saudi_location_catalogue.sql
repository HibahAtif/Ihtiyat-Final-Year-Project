begin;


/* --------------------------------------------------------------------------
 * EXPANDED SAUDI LOCATION CATALOGUE
 * --------------------------------------------------------------------------
 *
 * Expands the existing public.locations catalogue with the remaining
 * user-facing Saudi emirate headquarters and governorates required for V1.
 *
 * Source of truth for official codes, Arabic names and administrative
 * hierarchy:
 *   Saudi National Center for Archives and Records (NCAR)
 *   Unified Coding Guide for Administrative Regions, Governorates and
 *   Administrative Centres.
 *
 * The English names are user-facing transliterations audited against
 * Saudi English-language references. official_code remains the stable
 * external administrative identifier; English names must not be used as
 * identity keys.
 *
 * Existing rows intentionally NOT inserted here:
 *   - all 13 Saudi regions (already seeded)
 *   - Jeddah Governorate, official code 0124 (already seeded)
 *
 * This migration inserts:
 *   - 13 emirate headquarters
 *   - 139 additional governorates
 *   - 152 rows in total
 *
 * Administrative centres are deliberately outside the V1 location catalogue.
 *
 * Geoapify is not a source of truth for this table. Reverse-geocoded results
 * will later be matched to these curated rows and may fall back to the parent
 * region where no more-specific catalogue match is available.
 */


/* --------------------------------------------------------------------------
 * Controlled seed manifest
 * -------------------------------------------------------------------------- */

create temporary table seed_expanded_saudi_locations (
	parent_region_code text not null,
	official_code text not null,
	location_type text not null,
	name_en text not null,
	name_ar text not null,

	constraint seed_expanded_saudi_locations_parent_code
		check (parent_region_code ~ '^00[0-9]{2}$'),

	constraint seed_expanded_saudi_locations_official_code
		check (official_code ~ '^[0-9]{4}$'),

	constraint seed_expanded_saudi_locations_type
		check (
			location_type in (
				'emirate_headquarters',
				'governorate'
			)
		),

	constraint seed_expanded_saudi_locations_name_en
		check (
			char_length(trim(name_en)) between 1 and 120
			and name_en = trim(name_en)
		),

	constraint seed_expanded_saudi_locations_name_ar
		check (
			char_length(trim(name_ar)) between 1 and 120
			and name_ar = trim(name_ar)
		)
) on commit drop;


insert into seed_expanded_saudi_locations (
	parent_region_code,
	official_code,
	location_type,
	name_en,
	name_ar
)
values
	('0001', '0100', 'emirate_headquarters', 'Riyadh', 'الرياض'),
	('0001', '0101', 'governorate', 'Diriyah', 'الدرعية'),
	('0001', '0102', 'governorate', 'Al-Kharj', 'الخرج'),
	('0001', '0103', 'governorate', 'Al-Dawadmi', 'الدوادمي'),
	('0001', '0104', 'governorate', 'Al-Majma''ah', 'المجمعة'),
	('0001', '0105', 'governorate', 'Al-Quway''iyah', 'القويعية'),
	('0001', '0106', 'governorate', 'Wadi Al-Dawasir', 'وادي الدواسر'),
	('0001', '0107', 'governorate', 'Al-Aflaj', 'الأفلاج'),
	('0001', '0108', 'governorate', 'Al-Zulfi', 'الزلفي'),
	('0001', '0109', 'governorate', 'Shaqra', 'شقراء'),
	('0001', '0110', 'governorate', 'Howtat Bani Tamim', 'حوطة بني تميم'),
	('0001', '0111', 'governorate', 'Afif', 'عفيف'),
	('0001', '0112', 'governorate', 'Al-Sulayyil', 'السليل'),
	('0001', '0113', 'governorate', 'Dhurma', 'ضرماء'),
	('0001', '0114', 'governorate', 'Al-Muzahimiyah', 'المزاحمية'),
	('0001', '0115', 'governorate', 'Ramah', 'رماح'),
	('0001', '0116', 'governorate', 'Thadiq', 'ثادق'),
	('0001', '0117', 'governorate', 'Huraymila', 'حريملاء'),
	('0001', '0118', 'governorate', 'Al-Hariq', 'الحريق'),
	('0001', '0119', 'governorate', 'Al-Ghat', 'الغاط'),
	('0001', '0120', 'governorate', 'Marat', 'مرات'),
	('0001', '0121', 'governorate', 'Al-Dilam', 'الدلم'),
	('0001', '0122', 'governorate', 'Al-Rayn', 'الرين'),
	('0002', '0123', 'emirate_headquarters', 'Makkah', 'مكة المكرمة'),
	('0002', '0125', 'governorate', 'Taif', 'الطائف'),
	('0002', '0126', 'governorate', 'Al-Qunfudhah', 'القنفذه'),
	('0002', '0127', 'governorate', 'Al-Lith', 'الليث'),
	('0002', '0128', 'governorate', 'Rabigh', 'رابغ'),
	('0002', '0129', 'governorate', 'Al-Jumum', 'الجموم'),
	('0002', '0130', 'governorate', 'Khulays', 'خليص'),
	('0002', '0131', 'governorate', 'Al-Kamil', 'الكامل'),
	('0002', '0132', 'governorate', 'Al-Khurmah', 'الخرمة'),
	('0002', '0133', 'governorate', 'Ranyah', 'رنيه'),
	('0002', '0134', 'governorate', 'Turubah', 'تربة'),
	('0002', '0135', 'governorate', 'Maysan', 'ميسان'),
	('0002', '0136', 'governorate', 'Al-Muwayh', 'المويه'),
	('0002', '0137', 'governorate', 'Adham', 'أضم'),
	('0002', '0138', 'governorate', 'Al-Ardiyat', 'العرضيات'),
	('0002', '0139', 'governorate', 'Bahrah', 'بحره'),
	('0003', '0140', 'emirate_headquarters', 'Madinah', 'المدينة المنورة'),
	('0003', '0141', 'governorate', 'Yanbu', 'ينبع'),
	('0003', '0142', 'governorate', 'Al-Ula', 'العلا'),
	('0003', '0143', 'governorate', 'Al-Mahd', 'المهد'),
	('0003', '0144', 'governorate', 'Badr', 'بدر'),
	('0003', '0145', 'governorate', 'Khaybar', 'خيبر'),
	('0003', '0146', 'governorate', 'Al-Hanakiyah', 'الحناكية'),
	('0003', '0147', 'governorate', 'Al-Ais', 'العيص'),
	('0003', '0148', 'governorate', 'Wadi Al-Fara', 'وادي الفرع'),
	('0004', '0149', 'emirate_headquarters', 'Buraydah', 'بريدة'),
	('0004', '0150', 'governorate', 'Unayzah', 'عنيزة'),
	('0004', '0151', 'governorate', 'Al-Rass', 'الرس'),
	('0004', '0152', 'governorate', 'Al-Mithnab', 'المذنب'),
	('0004', '0153', 'governorate', 'Al-Bukayriyyah', 'البكيرية'),
	('0004', '0154', 'governorate', 'Al-Badai', 'البدائع'),
	('0004', '0155', 'governorate', 'Al-Asyah', 'الأسياح'),
	('0004', '0156', 'governorate', 'An-Nabhaniyah', 'النبهانية'),
	('0004', '0157', 'governorate', 'Uyun Al-Jiwa', 'عيون الجواء'),
	('0004', '0158', 'governorate', 'Riyadh Al-Khabra', 'رياض الخبراء'),
	('0004', '0159', 'governorate', 'Ash-Shimasiyah', 'الشماسية'),
	('0004', '0160', 'governorate', 'Uqlat As-Suqur', 'عقلة الصقور'),
	('0004', '0161', 'governorate', 'Dhariyah', 'ضرية'),
	('0004', '0251', 'governorate', 'Abanat', 'أبانات'),
	('0005', '0162', 'emirate_headquarters', 'Dammam', 'الدمام'),
	('0005', '0163', 'governorate', 'Al-Ahsa', 'الإحساء'),
	('0005', '0164', 'governorate', 'Hafr Al-Batin', 'حفر الباطن'),
	('0005', '0165', 'governorate', 'Al-Jubail', 'الجبيل'),
	('0005', '0166', 'governorate', 'Al-Qatif', 'القطيف'),
	('0005', '0167', 'governorate', 'Al-Khobar', 'الخبر'),
	('0005', '0168', 'governorate', 'Al-Khafji', 'الخفجي'),
	('0005', '0169', 'governorate', 'Ras Tanura', 'رأس تنورة'),
	('0005', '0170', 'governorate', 'Abqaiq', 'أبقيق'),
	('0005', '0171', 'governorate', 'Al-Nuayriyah', 'النعيرية'),
	('0005', '0172', 'governorate', 'Qaryat Al-Ulya', 'قرية العليا'),
	('0005', '0173', 'governorate', 'Al-Udayd', 'العديد'),
	('0005', '0174', 'governorate', 'Al-Bayda', 'البيضاء'),
	('0006', '0175', 'emirate_headquarters', 'Abha', 'أبها'),
	('0006', '0176', 'governorate', 'Khamis Mushait', 'خميس مشيط'),
	('0006', '0177', 'governorate', 'Bisha', 'بيشة'),
	('0006', '0178', 'governorate', 'Al-Namas', 'النماص'),
	('0006', '0179', 'governorate', 'Mahayil Asir', 'محايل'),
	('0006', '0180', 'governorate', 'Sarat Abidah', 'سراة عبيدة'),
	('0006', '0181', 'governorate', 'Tathlith', 'تثليث'),
	('0006', '0182', 'governorate', 'Rijal Almaa', 'رجال ألمع'),
	('0006', '0183', 'governorate', 'Ahad Rafidah', 'أحد رفيدة'),
	('0006', '0184', 'governorate', 'Dhahran Al-Janub', 'ظهران الجنوب'),
	('0006', '0185', 'governorate', 'Balqarn', 'بلقرن'),
	('0006', '0186', 'governorate', 'Al-Majaridah', 'المجاردة'),
	('0006', '0187', 'governorate', 'Tanumah', 'تنومة'),
	('0006', '0188', 'governorate', 'Tarib', 'طريب'),
	('0006', '0189', 'governorate', 'Bariq', 'بارق'),
	('0006', '0190', 'governorate', 'Al-Birk', 'البرك'),
	('0006', '0191', 'governorate', 'Al-Harajah', 'الحرجة'),
	('0006', '0192', 'governorate', 'Al-Amwah', 'الأمواه'),
	('0006', '0253', 'governorate', 'Al-Farshah', 'الفرشة'),
	('0007', '0193', 'emirate_headquarters', 'Tabuk', 'تبوك'),
	('0007', '0194', 'governorate', 'Al-Wajh', 'الوجه'),
	('0007', '0195', 'governorate', 'Duba', 'ضباء'),
	('0007', '0196', 'governorate', 'Tayma', 'تيماء'),
	('0007', '0197', 'governorate', 'Umluj', 'أملج'),
	('0007', '0198', 'governorate', 'Haql', 'حقل'),
	('0007', '0199', 'governorate', 'Al-Bad''', 'البدع'),
	('0008', '0200', 'emirate_headquarters', 'Hail', 'حائل'),
	('0008', '0201', 'governorate', 'Baqaa', 'بقعاء'),
	('0008', '0202', 'governorate', 'Al-Ghazalah', 'الغزالة'),
	('0008', '0203', 'governorate', 'Al-Shinan', 'الشنان'),
	('0008', '0204', 'governorate', 'Al-Sulaimi', 'السليمي'),
	('0008', '0205', 'governorate', 'Al-Hait', 'الحائط'),
	('0008', '0206', 'governorate', 'Sumaira', 'سميراء'),
	('0008', '0207', 'governorate', 'Al-Shamli', 'الشملي'),
	('0008', '0208', 'governorate', 'Mawqaq', 'موقق'),
	('0009', '0209', 'emirate_headquarters', 'Arar', 'عرعر'),
	('0009', '0210', 'governorate', 'Rafha', 'رفحاء'),
	('0009', '0211', 'governorate', 'Turaif', 'طريف'),
	('0009', '0212', 'governorate', 'Al-Uwayqilah', 'العويقيلة'),
	('0010', '0213', 'emirate_headquarters', 'Jazan', 'جازان'),
	('0010', '0214', 'governorate', 'Sabya', 'صبيا'),
	('0010', '0215', 'governorate', 'Abu Arish', 'أبو عريش'),
	('0010', '0216', 'governorate', 'Samtah', 'صامطة'),
	('0010', '0217', 'governorate', 'Al-Harath', 'الحرث'),
	('0010', '0218', 'governorate', 'Damad', 'ضمد'),
	('0010', '0219', 'governorate', 'Al-Rayth', 'الريث'),
	('0010', '0220', 'governorate', 'Baish', 'بيش'),
	('0010', '0221', 'governorate', 'Farasan', 'جزر فرسان'),
	('0010', '0222', 'governorate', 'Al-Dayer', 'الدائر'),
	('0010', '0223', 'governorate', 'Ahad Al-Masarihah', 'أحد المسارحة'),
	('0010', '0224', 'governorate', 'Al-Eidabi', 'العيدابي'),
	('0010', '0225', 'governorate', 'Al-Aridah', 'العارضة'),
	('0010', '0226', 'governorate', 'Al-Darb', 'الدرب'),
	('0010', '0227', 'governorate', 'Harub', 'هروب'),
	('0010', '0228', 'governorate', 'Fayfa', 'فيفا'),
	('0010', '0229', 'governorate', 'Al-Tuwal', 'الطوال'),
	('0011', '0230', 'emirate_headquarters', 'Najran', 'نجران'),
	('0011', '0231', 'governorate', 'Sharurah', 'شرورة'),
	('0011', '0232', 'governorate', 'Hubuna', 'حبونا'),
	('0011', '0233', 'governorate', 'Badr Al-Janub', 'بدر الجنوب'),
	('0011', '0234', 'governorate', 'Yadamah', 'يدمة'),
	('0011', '0235', 'governorate', 'Thar', 'ثار'),
	('0011', '0236', 'governorate', 'Khibash', 'خباش'),
	('0012', '0237', 'emirate_headquarters', 'Al-Baha', 'الباحة'),
	('0012', '0238', 'governorate', 'Baljurashi', 'بلجرشي'),
	('0012', '0239', 'governorate', 'Al-Mandaq', 'المندق'),
	('0012', '0240', 'governorate', 'Al-Mikhwah', 'المخواة'),
	('0012', '0241', 'governorate', 'Al-Aqiq', 'العقيق'),
	('0012', '0242', 'governorate', 'Qilwah', 'قلوة'),
	('0012', '0243', 'governorate', 'Al-Qara', 'القرى'),
	('0012', '0244', 'governorate', 'Bani Hasan', 'بني حسن'),
	('0012', '0245', 'governorate', 'Ghamid Al-Zinad', 'غامد الزناد'),
	('0012', '0246', 'governorate', 'Al-Hajrah', 'الحجرة'),
	('0013', '0247', 'emirate_headquarters', 'Sakaka', 'سكاكا'),
	('0013', '0248', 'governorate', 'Al-Qurayyat', 'القريات'),
	('0013', '0249', 'governorate', 'Dawmat Al-Jandal', 'دومة الجندل'),
	('0013', '0250', 'governorate', 'Tabarjal', 'طبرجل');


/* --------------------------------------------------------------------------
 * Validate the manifest before touching public.locations
 * -------------------------------------------------------------------------- */

do $$
declare
	seed_count integer;
	headquarters_count integer;
	governorate_count integer;
	duplicate_code_count integer;
	missing_parent_count integer;
	preexisting_code_count integer;
begin
	select count(*)
	into seed_count
	from seed_expanded_saudi_locations;

	if seed_count <> 152 then
		raise exception
			'Expanded Saudi location seed expected 152 rows but found %.',
			seed_count;
	end if;

	select count(*)
	into headquarters_count
	from seed_expanded_saudi_locations
	where location_type = 'emirate_headquarters';

	if headquarters_count <> 13 then
		raise exception
			'Expanded Saudi location seed expected 13 emirate headquarters but found %.',
			headquarters_count;
	end if;

	select count(*)
	into governorate_count
	from seed_expanded_saudi_locations
	where location_type = 'governorate';

	if governorate_count <> 139 then
		raise exception
			'Expanded Saudi location seed expected 139 new governorates but found %.',
			governorate_count;
	end if;

	select count(*)
	into duplicate_code_count
	from (
		select official_code
		from seed_expanded_saudi_locations
		group by official_code
		having count(*) > 1
	) as duplicate_codes;

	if duplicate_code_count <> 0 then
		raise exception
			'Expanded Saudi location seed contains % duplicate official code(s).',
			duplicate_code_count;
	end if;

	if exists (
		select 1
		from seed_expanded_saudi_locations
		where official_code = '0124'
	) then
		raise exception
			'Jeddah Governorate 0124 must not be inserted again.';
	end if;

	select count(*)
	into missing_parent_count
	from (
		select distinct seed.parent_region_code
		from seed_expanded_saudi_locations as seed
		left join public.locations as region
			on region.official_code = seed.parent_region_code
			and region.location_type = 'region'
			and region.is_active
		where region.id is null
	) as missing_parents;

	if missing_parent_count <> 0 then
		raise exception
			'Expanded Saudi location seed references % missing or inactive parent region(s).',
			missing_parent_count;
	end if;

	select count(*)
	into preexisting_code_count
	from seed_expanded_saudi_locations as seed
	join public.locations as existing_location
		on existing_location.official_code = seed.official_code;

	if preexisting_code_count <> 0 then
		raise exception
			'Expanded Saudi location seed contains % official code(s) already present in public.locations.',
			preexisting_code_count;
	end if;
end;
$$;


/* --------------------------------------------------------------------------
 * Insert the verified rows using the existing region hierarchy
 * -------------------------------------------------------------------------- */

insert into public.locations (
	parent_id,
	official_code,
	location_type,
	name_en,
	name_ar
)
select
	parent_region.id,
	seed.official_code,
	seed.location_type,
	seed.name_en,
	seed.name_ar
from seed_expanded_saudi_locations as seed
join public.locations as parent_region
	on parent_region.official_code = seed.parent_region_code
	and parent_region.location_type = 'region'
	and parent_region.is_active
order by seed.official_code;


/* --------------------------------------------------------------------------
 * Validate the final V1 catalogue produced by this migration
 * -------------------------------------------------------------------------- */

do $$
declare
	total_location_count integer;
	region_count integer;
	headquarters_count integer;
	governorate_count integer;
	administrative_centre_count integer;
	jeddah_count integer;
	invalid_parent_count integer;
begin
	select count(*)
	into total_location_count
	from public.locations;

	if total_location_count <> 166 then
		raise exception
			'Final V1 location catalogue expected 166 rows but found %.',
			total_location_count;
	end if;

	select count(*)
	into region_count
	from public.locations
	where location_type = 'region';

	if region_count <> 13 then
		raise exception
			'Final V1 location catalogue expected 13 regions but found %.',
			region_count;
	end if;

	select count(*)
	into headquarters_count
	from public.locations
	where location_type = 'emirate_headquarters';

	if headquarters_count <> 13 then
		raise exception
			'Final V1 location catalogue expected 13 emirate headquarters but found %.',
			headquarters_count;
	end if;

	select count(*)
	into governorate_count
	from public.locations
	where location_type = 'governorate';

	if governorate_count <> 140 then
		raise exception
			'Final V1 location catalogue expected 140 governorates but found %.',
			governorate_count;
	end if;

	select count(*)
	into administrative_centre_count
	from public.locations
	where location_type = 'administrative_centre';

	if administrative_centre_count <> 0 then
		raise exception
			'V1 location catalogue expected no administrative centres but found %.',
			administrative_centre_count;
	end if;

	select count(*)
	into jeddah_count
	from public.locations
	where official_code = '0124'
		and location_type = 'governorate'
		and name_en = 'Jeddah'
		and name_ar = 'جدة';

	if jeddah_count <> 1 then
		raise exception
			'Jeddah Governorate 0124 expected exactly once but found % row(s).',
			jeddah_count;
	end if;

	select count(*)
	into invalid_parent_count
	from public.locations as child_location
	left join public.locations as parent_region
		on parent_region.id = child_location.parent_id
	where child_location.location_type <> 'region'
		and (
			parent_region.id is null
			or parent_region.location_type <> 'region'
		);

	if invalid_parent_count <> 0 then
		raise exception
			'Final V1 location catalogue contains % granular location(s) without a region parent.',
			invalid_parent_count;
	end if;
end;
$$;


commit;
