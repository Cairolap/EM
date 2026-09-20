PRAGMA foreign_keys = OFF;

PRAGMA foreign_keys = OFF; -- Disable temporarily for bulk snapshot loading
INSERT OR REPLACE INTO departments (id, name, is_active) VALUES ('CC', 'ฝาจีบ', 1);

INSERT OR REPLACE INTO departments (id, name, is_active) VALUES ('PP', 'ฝาเกลียว', 1);

INSERT OR REPLACE INTO departments (id, name, is_active) VALUES ('MX', 'ฝาแม็กซี่', 1);

INSERT OR REPLACE INTO departments (id, name, is_active) VALUES ('PC', 'ฝาพลาสติก', 1);

INSERT OR REPLACE INTO departments (id, name, is_active) VALUES ('PR', 'งานพิมพ์', 1);

INSERT OR REPLACE INTO departments (id, name, is_active) VALUES ('OT', 'อื่นๆ', 1);

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CC0', 'CC', 'CENTER', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CC1', 'CC', 'Line 1', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CC2', 'CC', 'Line 2', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CC4', 'CC', 'Line 4', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CC5', 'CC', 'Line 5', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CC6', 'CC', 'Line 6', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP0', 'PP', 'CENTER', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP16', 'PP', '28IR', 0, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP13', 'PP', '22STD', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP14', 'PP', '28SHL1', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP15', 'PP', '28SHL2', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP02', 'PP', '28STD2', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP21', 'PP', '28IR2', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP20', 'PP', '28STD7', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP18', 'PP', '28STD6', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP12', 'PP', '28STD5', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP11', 'PP', '30ED15DIE', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP19', 'PP', '28SHL4', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PP03', 'PP', '28DEEP', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PPC1', 'PP', 'COMPOSITE 1', 0, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PPC2', 'PP', 'COMPOSITE 2', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('MX0', 'MX', 'CENTER', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('MX301', 'MX', 'MX301', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('MX302', 'MX', 'MX302', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('MX303', 'MX', 'MX303', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('MX331', 'MX', 'XP331', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('MX332', 'MX', 'XP332', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('MX362', 'MX', 'XC362', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('MX364', 'MX', 'XC364', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('MX361', 'MX', 'XC361', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('MXSSP', 'MX', 'Scroll Shear', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CP00', 'PC', 'CENTER', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CP01', 'PC', 'CP01', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CP02', 'PC', 'CP02', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CP03', 'PC', 'CP03', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CP04', 'PC', 'CP04', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CP05', 'PC', 'CP05', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CP06', 'PC', 'CP06', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CP07', 'PC', 'CP07', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CP08', 'PC', 'CP08', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CP09', 'PC', 'CP09', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CP10', 'PC', 'CP10', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('CPINJ', 'PC', 'INJ', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PR00', 'PR', 'CENTER', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PR01', 'PR', 'Line 1', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PR02', 'PR', 'Line 2', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PR03', 'PR', 'Line 3', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PR04', 'PR', 'Line 5', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PR05', 'PR', 'Line 8', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PR06', 'PR', 'Line 9', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PR07', 'PR', 'Line 6', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PR08', 'PR', 'Line 10', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PR09', 'PR', 'Line 7', 1, '');

INSERT OR REPLACE INTO lines (id, department_id, name, is_active, remark) VALUES ('PR10', 'PR', 'อื่นๆ', 1, '');

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-a8295896-8bc8-46b4-83e5-a5976b559576', 'OMRON', 'omron', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-d7e4eadd-a2c8-4d1a-a59e-01b74192f957', 'Fuji Electric', 'fuji electric', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-91a4f87f-2ac9-4c4b-9d73-2d660b6f1a5e', 'ABB', 'abb', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-95a421ff-8b6c-4466-8851-7a8a33c30f32', 'SIEMENS', 'siemens', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-fb1c8353-1ea0-4627-8bb3-9b715ffb846e', 'LEGRAND', 'legrand', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-24ef11fa-30a7-4d6f-926e-db1f250c256b', 'SACMI', 'sacmi', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-c47b1934-2992-4824-8a09-c199c5d71e9b', 'PILZ', 'pilz', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-859bb435-d8cc-4e97-bffa-4ff30ea7adb1', 'Datalogic', 'datalogic', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-2bd8f6f5-32f4-41bc-bc1e-bdfed883adf4', 'EATON', 'eaton', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-b88f3e70-0686-4494-bae6-ab504f9083b2', 'Schaffner', 'schaffner', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-68a858f6-cab8-42dc-a252-a6d1eaa21b4b', 'YASKAWA', 'yaskawa', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-f4642bd3-c68a-423e-9c41-10286253ee8b', 'Schmersal', 'schmersal', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-1241dbd0-c7eb-4cf4-9536-94d28a23327a', 'Pizzato', 'pizzato', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-878cd897-c005-470f-a396-ff94c949383d', 'Finder', 'finder', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-3e0c7568-f8b6-4ab0-a047-a7fa664b2ebd', 'Weidmüller', 'weidmüller', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-9e284a6c-1d66-41cf-97c5-2b5dbb8e435a', 'Fandis', 'fandis', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-9173d6cd-aec3-48ee-98f0-7c0572f93982', 'TEXA', 'texa', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-c9617985-7a1a-4d62-8e12-00b7ca8e04b0', 'COSTECH', 'costech', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-bf6576e2-daa5-4e2b-9afc-75097c941a81', 'Datasensing', 'datasensing', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-0f3bd4c6-c796-4518-9722-831ed50d04dc', 'BALLUFF', 'balluff', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-ea275599-4692-4978-8dbf-c259df31d461', 'Carlo Gavazzi', 'carlo gavazzi', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-9f9b68f6-d3af-4fde-a361-952de5c5fa13', 'Festo', 'festo', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-b9e2e7e5-e962-4f10-b0b3-f72e4ad1bfd6', 'lika', 'lika', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-aa0868fb-a420-4322-b677-02bb4b9cc9ec', 'PHOENIX CONTACT', 'phoenix contact', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-df752a86-0751-4e84-aca4-18f8f5999ee5', 'BECKHOFF', 'beckhoff', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-86cc655d-c9f1-4554-af94-73a177d9c21e', 'KOGANEI', 'koganei', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-e4fb4ea3-7bf0-4c60-aaae-49cacdfd643b', 'Metal Work', 'metal work', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-fa5642ba-78ed-4400-863d-1dfb6f772eb6', 'MAC', 'mac', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-5eb6efa2-6a7f-424f-a09e-e2a1b179ed61', 'Danfoss', 'danfoss', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-9f39f3b4-22e0-4cec-bf20-473c1dc6773b', 'Allen Bradley', 'allen bradley', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-14df8e4d-9cc0-4cf2-822a-ad58a9dc53c8', 'NATIONAL', 'national', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-98e7ad61-edb9-4103-b0e7-df51d6b56105', 'SOCOMEC', 'socomec', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-f297668b-0b3a-4365-912d-c200de60b4ec', 'Wöhner', 'wöhner', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-02ba4115-6c55-484e-a41c-a087867a5d95', 'CKD', 'ckd', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-32e43ed3-70ad-4525-9fb1-764eb2e8a2ff', 'Murrelektronik', 'murrelektronik', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-bd3c0674-21a7-4b0d-94f7-ad8b255b7903', 'RITTAL', 'rittal', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-c1740dd0-4b11-4b0f-9f45-e0a60666429b', 'GEWISS', 'gewiss', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-eef22c1d-192b-4030-96d3-a4d4b9bd1c08', 'Schneider', 'schneider', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-7a6028dd-5793-4ab7-8d96-422f989757f3', 'IDEC', 'idec', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-108ad7ff-6d53-4741-9b9b-66d7fd7bc3fc', 'FUJI', 'fuji', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-b4908bfe-1a4a-4e5b-a568-357856c3e32a', 'Panasonic', 'panasonic', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-7815ddac-ef67-42c9-8f9a-dca676cd2730', 'MITSUBISHI', 'mitsubishi', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-73a465da-8014-46c7-a6ac-94e4d6f3b889', 'Turck', 'turck', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-3a68d0ee-e906-4db0-a215-3d584ffb9610', 'Patlite', 'patlite', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-803d366b-f32c-459d-a4b5-9147d48e4c00', 'Bonfiglioli', 'bonfiglioli', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-eba8d4d8-b44b-4d89-9e5d-c3befc8779f4', 'Oriental Motor', 'oriental motor', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-f2448ef6-ce79-47c0-9997-50171562d008', 'Azbil', 'azbil', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-ded4355a-0294-4969-b72b-4ef0d59ebd3f', 'KEYENCE', 'keyence', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-b51bf1ff-a14b-4dff-ae20-04c53d07a1fd', 'Sumitomo', 'sumitomo', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-e13c92ab-376f-4d22-b6da-0584ab17efbd', 'EGLE', 'egle', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-983c9e38-5a04-4c40-81bb-dd0ea59eb9d9', 'DAIICHI', 'daiichi', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-4bf4b2b3-226f-4158-ab16-16ee63bca07f', 'C&S Electric', 'c&s electric', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-7b2dda8f-0a7a-4d42-bb34-89405c6f2e7d', 'RKC', 'rkc', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-dda5ff09-7390-4791-ac07-0c4caeb61521', 'DAKO', 'dako', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-3807cae2-7f8f-4bb7-8d14-372e5e47f0e5', 'SICK', 'sick', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-fb06de67-8c04-4a0d-9ca0-ed3b227e03aa', 'AIHARA', 'aihara', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-63c80f11-a07e-42d3-a5b2-6213da48f4ea', 'EURO DRIVE', 'euro drive', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-aef77bcd-e040-47cb-9e2a-4b228223a7d7', 'SMC', 'smc', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-7f27b5ac-8f33-4882-80dc-918500fc4a00', 'JFC', 'jfc', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-4b1f9d40-8802-462d-a453-d3c4c4c568f2', 'EWON', 'ewon', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-7c0bd7ac-be8c-45ab-b890-816aa61fdbe3', 'MISUMI', 'misumi', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-94cb733a-eeae-40fb-a1ad-a061c89b97f9', 'ifm', 'ifm', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-596cb42b-a725-477b-b3be-8659b79df912', 'Baumer', 'baumer', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-9d3c8616-91dd-4643-a3e9-734bfe870d99', 'WEBER', 'weber', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-7333f975-694a-4df3-95ac-0ea8752aab32', 'SEW', 'sew', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-b8d1a14f-77ca-4e36-b119-566980b570d2', 'REO AG', 'reo ag', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-e31842c1-ff61-42c9-a451-533569c51a75', 'TOSHIBA', 'toshiba', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-5a762178-39d4-4bb9-9a7f-b80a6ac242e4', 'SAMCO', 'samco', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-66399acd-6b2b-456b-a667-e60efcbd4cc2', 'STR NISSEI', 'str nissei', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-41e70333-3b9f-4f19-9e67-ab30c3aa21ec', 'HITACHI', 'hitachi', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-2cd97c95-2a1a-4224-8d8d-9106f72117f1', 'MAKITA', 'makita', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-d8f4e71a-e348-496e-9702-6eb197260459', 'Pneumax', 'pneumax', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-f50bdc54-e7ad-4e3c-a343-25199ebdaccc', 'Pepperl + Fuchs', 'pepperl + fuchs', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-aeb8175b-323d-4c60-8630-e451a41106f0', 'MCN', 'mcn', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-beb380a0-8d4e-468b-8df8-4371e32413d0', 'Motovario', 'motovario', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-9db52f45-e004-4c33-b9c6-13897fe34c51', 'Norvax', 'norvax', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-45807b0e-89af-4f7f-ba54-6343346af7c0', 'COSEL', 'cosel', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-07455d99-7c82-4534-b659-4a6e54773a8c', 'Pro-face', 'pro-face', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-3ef1a676-ec21-4bbe-978d-89fb6430645a', 'PRIMUS', 'primus', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-e7fbd9e0-5df5-42a0-a6e3-841ae9de7e2a', 'Autonics', 'autonics', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-3f1eab27-2565-4f15-ba00-a0958ef89e44', 'TDK', 'tdk', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-624ec235-f948-42da-95bb-830fb06d7a26', 'NIHON KAIHEIKI', 'nihon kaiheiki', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-f1159eb7-8c1f-46a8-be8d-d40f85264f47', 'YAMATAKE', 'yamatake', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-db8f88c4-122f-4a1b-ae88-ecbaa53e8f22', 'LAVA', 'lava', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-e6441413-bee1-4776-8e95-8fd3f4bcac04', 'ICME', 'icme', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-7616d7e2-8211-4252-9b40-0987fc96586a', 'Vincotech', 'vincotech', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-0912ff3b-1a1c-40f4-9fe2-9620cbe55133', 'PESCE SRL', 'pesce srl', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-4e941770-91d8-4b00-af12-b5541b0a31ad', 'VS Technology', 'vs technology', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-f178ed2b-4a53-41f6-a25b-3fe91e7501cf', 'VARICAM', 'varicam', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-0e5ecf74-de97-4bd2-b9d0-a0d2470332d4', 'BECKER', 'becker', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-f421ce13-7f88-4481-9554-ad838cb4455a', 'WIP', 'wip', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-b77cc40d-044f-4a90-aa75-bb5964151f2f', 'B&R AUTOMATION', 'b&r automation', 1, 1);

INSERT OR REPLACE INTO brands (id, name, normalized_name, is_active, version) VALUES ('BR-7a2804b2-dfd5-40aa-9bcb-8b47e0bd2650', 'Telemecanique', 'telemecanique', 1, 1);

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC0-1', 'AP101', 'ap101', 'AUTO PACKING CC1',
    'CC', 'CC0',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.355Z',
    'import',
    '2026-09-20T14:49:57.357Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC0-2', 'AP102', 'ap102', 'AUTO PACKING CC2',
    'CC', 'CC0',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.357Z',
    'import',
    '2026-09-20T14:49:57.357Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC0-3', 'CC1000', 'cc1000', 'Crown Cap : Center',
    'CC', 'CC0',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.357Z',
    'import',
    '2026-09-20T14:49:57.357Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC1-1', 'PRS108', 'prs108', 'PRESS',
    'CC', 'CC1',
    'SACMI',
    'PTC600A',
    '10197057',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC1-2', 'LNR120', 'lnr120', 'LINING MACHINE',
    'CC', 'CC1',
    'SACMI',
    'PMC500C',
    '10267996',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC1-3', 'PAC101', 'pac101', 'Cap Cooling Belt',
    'CC', 'CC1',
    '',
    '',
    '10307803',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC1-4', 'OTHER', 'other', 'PTC600A (SACMI)',
    'CC', 'CC1',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC2-1', 'PRS109', 'prs109', 'PRESS',
    'CC', 'CC2',
    'SACMI',
    'PTC027A',
    '10027705',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC2-2', 'LNR121', 'lnr121', 'Lining Machine',
    'CC', 'CC2',
    'SACMI',
    'PMC300A',
    '10027752',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC2-3', 'LNR122', 'lnr122', 'Lining Machine',
    'CC', 'CC2',
    'SACMI',
    'PMC300A',
    '10042238',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC2-4', 'PAC102', 'pac102', 'Cap Cooling Belt',
    'CC', 'CC2',
    '',
    '',
    '10052821,10052824',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC2-5', 'OTHER-CC2-5', 'other-cc2-5', 'PTC027A (SACMI)',
    'CC', 'CC2',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC4-1', 'PRS104', 'prs104', 'Press Line4',
    'CC', 'CC4',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC4-2', 'LNR105', 'lnr105', 'Liner Zamatic',
    'CC', 'CC4',
    'SACMI',
    '',
    '10014482',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC4-3', 'PAC104', 'pac104', 'Cap Cooling Belt Line 4',
    'CC', 'CC4',
    '',
    '',
    '10338273',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC4-4', 'OTHER-CC4-4', 'other-cc4-4', 'Press Line4',
    'CC', 'CC4',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC5-1', 'PRS105', 'prs105', 'PRESS Line5',
    'CC', 'CC5',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC5-2', 'LNR106', 'lnr106', 'Liner Zamatic Line2',
    'CC', 'CC5',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC5-3', 'LNR113', 'lnr113', 'Liner Zamatic Line5',
    'CC', 'CC5',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC5-4', 'LNR114', 'lnr114', 'Liner Zamatic Line5',
    'CC', 'CC5',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC5-5', 'VID102', 'vid102', 'Video Inspection Line 5',
    'CC', 'CC5',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC5-6', 'OTHER-CC5-6', 'other-cc5-6', 'PRESS Line5',
    'CC', 'CC5',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC6-1', 'PRS106', 'prs106', 'Press Line6',
    'CC', 'CC6',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC6-2', 'LNR116', 'lnr116', 'Liner Zamatic Line6',
    'CC', 'CC6',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC6-3', 'LNR117', 'lnr117', 'Liner Zamatic Line6',
    'CC', 'CC6',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC6-4', 'LNR118', 'lnr118', 'Liner Zamatic Line6',
    'CC', 'CC6',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC6-5', 'VID103', 'vid103', 'Video Inspection Line 6',
    'CC', 'CC6',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC6-6', 'OTHER-CC6-6', 'other-cc6-6', 'Press Line6',
    'CC', 'CC6',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CC0-4', 'VID104', 'vid104', 'VID OFF LINE CAT300',
    'CC', 'CC0',
    '',
    '',
    '10127635',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    'เลือกฝา-VID',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX00-1', 'RB2', 'rb2', 'ROBOT PALLETZER',
    'MX', 'MX0',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX00-2', 'AP301', 'ap301', 'Auto Packing 301',
    'MX', 'MX0',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX00-3', 'AP302', 'ap302', 'Auto Packing 302',
    'MX', 'MX0',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX00-4', 'MX1000', 'mx1000', 'MAXI : Center',
    'MX', 'MX0',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX301-1', 'PRS301', 'prs301', 'Press 301',
    'MX', 'MX301',
    'Naroska',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX301-2', 'MRT301', 'mrt301', 'MR-T RING-O-MATIC M/C',
    'MX', 'MX301',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX301-3', 'LNR301', 'lnr301', 'Liner Zamatic',
    'MX', 'MX301',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX301-4', 'OVN301', 'ovn301', 'Oven',
    'MX', 'MX301',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX301-5', 'CNT301', 'cnt301', 'Counter',
    'MX', 'MX301',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX301-6', 'OTHER-MX301-6', 'other-mx301-6', 'Other MX Line 1',
    'MX', 'MX301',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX302-1', 'PRS302', 'prs302', 'Press 302',
    'MX', 'MX302',
    'Naroska',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX302-2', 'LNR302', 'lnr302', 'Liner Zamatic',
    'MX', 'MX302',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX302-3', 'MRT302', 'mrt302', 'MR-T RING-O-MATIC M/C',
    'MX', 'MX302',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX302-4', 'OVN302', 'ovn302', 'Oven',
    'MX', 'MX302',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX302-5', 'CNT302', 'cnt302', 'Counter',
    'MX', 'MX302',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX302-6', 'OTHER-MX302-6', 'other-mx302-6', 'Other MX Line 2',
    'MX', 'MX302',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX303-1', 'PRS303', 'prs303', 'Press 303',
    'MX', 'MX303',
    'Naroska',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX303-2', 'LNR303', 'lnr303', 'Liner Zamatic',
    'MX', 'MX303',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX303-3', 'MRT303', 'mrt303', 'MR-T RING-O-MATIC M/C',
    'MX', 'MX303',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX303-4', 'OVN303', 'ovn303', 'Oven',
    'MX', 'MX303',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX303-5', 'CNT303', 'cnt303', 'Counter',
    'MX', 'MX303',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX303-6', 'OTHER-MX303-6', 'other-mx303-6', 'Other MX Line 3',
    'MX', 'MX303',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX331-1', 'PRS331', 'prs331', 'PUD 60 Press XP1',
    'MX', 'MX331',
    'PUD',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX331-2', 'LNR331', 'lnr331', 'Liner Zamatic',
    'MX', 'MX331',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX331-3', 'PR2331', 'pr2331', 'PRT-2',
    'MX', 'MX331',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX331-4', 'CNT331', 'cnt331', 'Counter',
    'MX', 'MX331',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX331-5', 'OTHER-MX331-5', 'other-mx331-5', 'Other XP Line 4',
    'MX', 'MX331',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX361-1', 'PRS361', 'prs361', '4,6 Die Press PUD60',
    'MX', 'MX361',
    'PUD',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX361-2', 'LNR361', 'lnr361', 'Liner Zamatic',
    'MX', 'MX361',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX361-3', 'CNT361', 'cnt361', 'Counter',
    'MX', 'MX361',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX361-4', 'OTHER-MX361-4', 'other-mx361-4', 'Other XC Line 5',
    'MX', 'MX361',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX362-1', 'PRS362', 'prs362', '4,6 Die Press PUD60',
    'MX', 'MX362',
    'PUD',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX362-2', 'LNR362', 'lnr362', 'Liner Zamatic',
    'MX', 'MX362',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX362-3', 'CNT362', 'cnt362', 'Counter',
    'MX', 'MX362',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX362-4', 'OTHER-MX362-4', 'other-mx362-4', 'Other XC Line 6',
    'MX', 'MX362',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MXSSP-1', 'SSP301', 'ssp301', 'Scroll Shear Press',
    'MX', 'MXSSP',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MXSSP-2', 'SSP302', 'ssp302', 'Scroll Shear Press',
    'MX', 'MXSSP',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MXSSP-3', 'OTHER-MXSSP-3', 'other-mxssp-3', 'Other MX Line 7',
    'MX', 'MXSSP',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX364-1', 'PRS364', 'prs364', 'Pud Press Line 8 ( 42 MM.)',
    'MX', 'MX364',
    'PUD',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX364-2', 'LNR364', 'lnr364', 'Zamatic Line (MAXI CAP 42 MM.)',
    'MX', 'MX364',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX364-3', 'LNR365', 'lnr365', 'Lining Machine',
    'MX', 'MX364',
    'SACMI',
    'PMA24',
    '10137031',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX364-4', 'CNT364', 'cnt364', 'Counter',
    'MX', 'MX364',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX364-5', 'OTHER-MX364-5', 'other-mx364-5', 'Pud Press Line 8 ( 42 MM.)',
    'MX', 'MX364',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX332-1', 'PRS332', 'prs332', 'PUD Presss XP2',
    'MX', 'MX332',
    'PUD',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX332-2', 'LNR332', 'lnr332', 'Zamatic XP2',
    'MX', 'MX332',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX332-3', 'PR2332', 'pr2332', 'PRT-2 XP2',
    'MX', 'MX332',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX332-4', 'CNT332', 'cnt332', 'Counter XP2',
    'MX', 'MX332',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'MX332-5', 'OTHER-MX332-5', 'other-mx332-5', 'PUD Presss XP2',
    'MX', 'MX332',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC1-1', 'ASS216', 'ass216', 'ASSEMBLY NOMAL',
    'PP', 'PPC1',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC1-2', 'LNR216', 'lnr216', 'LINNER COMPOSIT LINE 1',
    'PP', 'PPC1',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC1-3', 'INV217', 'inv217', 'INVERTING NORMAL',
    'PP', 'PPC1',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC1-4', 'LNR217', 'lnr217', 'LINNER COMPOSIT LINE 1',
    'PP', 'PPC1',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.358Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC1-5', 'PRS216', 'prs216', 'MUB COMPOSITE LINE 1',
    'PP', 'PPC1',
    'MUB',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.358Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC2-1', 'PRS217', 'prs217', 'MUB COMPOSITE LINE 2',
    'PP', 'PPC2',
    'MUB',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-17T06:36:53.531Z',
    'eercsc@gmail.com',
    1,
    2,
    'a99a84e8-d156-48a4-aa22-b85a8c8cd186'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC2-2', 'LNR218', 'lnr218', 'LINNER COMPOSIT LINE 2',
    'PP', 'PPC2',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-17T07:10:10.518Z',
    'eercsc@gmail.com',
    1,
    3,
    '64d146a6-35c9-40ff-b3b5-aa29411adc34'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC2-3', 'LNR219', 'lnr219', 'LINNER COMPOSIT LINE 2',
    'PP', 'PPC2',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-17T07:09:31.515Z',
    'eercsc@gmail.com',
    1,
    3,
    '76629c49-68a6-4fe7-a413-f7d0fb1e003d'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC2-4', 'OVN', 'ovn', 'OVEN 3',
    'PP', 'PPC2',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    0,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC2-5', 'INV217-PPC2-5', 'inv217-ppc2-5', 'INVERTING SHORT HIGH',
    'PP', 'PPC2',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC2-6', 'INV002', 'inv002', 'INV002',
    'PP', 'PPC2',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    0,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC2-7', 'ASS217', 'ass217', 'ASSEMBLY SHORT HIGH',
    'PP', 'PPC2',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC2-8', 'ASS002', 'ass002', 'ASS002',
    'PP', 'PPC2',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    0,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC2-9', 'VID218', 'vid218', 'COMPOSITE 2',
    'PP', 'PPC2',
    '',
    'CHS102B',
    '10399515',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-17T06:37:22.510Z',
    'eercsc@gmail.com',
    1,
    2,
    '87386f7d-085a-4806-9cd2-b032da627636'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PPC2-10', 'OTHER-PPC2-10', 'other-ppc2-10', 'Other PP1 CP 2',
    'PP', 'PPC2',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP00-1', 'OL201', 'ol201', 'Sorting Offline (SACMI)',
    'PP', 'PP0',
    '',
    '',
    '10563125',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP00-2', 'AP201', 'ap201', 'AUTO PACKING',
    'PP', 'PP0',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP00-3', 'OL202', 'ol202', 'Sorting Offline (SACMI)',
    'PP', 'PP0',
    '',
    '',
    '10563126',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP00-4', 'PP1000', 'pp1000', 'PP Cap : Center',
    'PP', 'PP0',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP00-5', 'AP202', 'ap202', 'AUTO PACKING',
    'PP', 'PP0',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP02-1', 'PRS202', 'prs202', '6 Die Press MUB',
    'PP', 'PP02',
    'MUB',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP02-2', 'ROL203', 'rol203', 'Rolling R85',
    'PP', 'PP02',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP02-3', 'ROL204', 'rol204', 'Rolling R85',
    'PP', 'PP02',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP02-4', 'LNR203', 'lnr203', 'TOYOZA MOLDED PE/P2',
    'PP', 'PP02',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP02-5', 'VID206', 'vid206', '28STD2',
    'PP', 'PP02',
    '',
    'CHS200D',
    '10417605',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP02-6', 'LASER002', 'laser002', 'LASER 28STD2',
    'PP', 'PP02',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP03-1', 'PRS210T', 'prs210t', '5 Die Press MUB 28.Deep (PRS209D)',
    'PP', 'PP03',
    'MUB',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP03-2', 'PRS208', 'prs208', '5 Die Press MUB 28.Deep (PRS209D)',
    'PP', 'PP03',
    'MUB',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP03-3', 'HOP203', 'hop203', 'HOPPER CAP to ROL',
    'PP', 'PP03',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP03-4', 'ROL205', 'rol205', 'Rolling R8D',
    'PP', 'PP03',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP03-5', 'PAC205', 'pac205', 'Packing L8D',
    'PP', 'PP03',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP03-6', 'HOP203N', 'hop203n', 'CONTROL HOPPER',
    'PP', 'PP03',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP03-7', 'VID222', 'vid222', '28 DEEP VID Inspection',
    'PP', 'PP03',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP03-8', 'OTHER-PP03-8', 'other-pp03-8', 'Other PP1 L 03',
    'PP', 'PP03',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP11-1', 'PRS218', 'prs218', 'PRESS',
    'PP', 'PP11',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP11-2', 'RED203', 'red203', 'REDRAW',
    'PP', 'PP11',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP11-3', 'ROL222', 'rol222', 'ROLLING',
    'PP', 'PP11',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP11-4', 'PAC212', 'pac212', 'PACKING',
    'PP', 'PP11',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP11-5', 'VID214', 'vid214', 'VID',
    'PP', 'PP11',
    '',
    'CHS005D',
    '10181302',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP11-6', 'OTHER-PP11-6', 'other-pp11-6', 'Other PP1 L 11',
    'PP', 'PP11',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-1', 'PRS221', 'prs221', 'PRESS #5',
    'PP', 'PP12',
    'SACMI',
    'PTV019',
    '10156604',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-2', 'ROL225', 'rol225', 'ROLLING 5.1',
    'PP', 'PP12',
    'MACA',
    'BRV/9',
    '379C-D',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-3', 'ROL226', 'rol226', 'ROLLING 5.2',
    'PP', 'PP12',
    'MACA',
    'BRV/10',
    '379A-B',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-4', 'ROL234', 'rol234', 'ROLLING 5.3',
    'PP', 'PP12',
    'MACA',
    'BRV/11',
    '544A-B',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-5', 'VID211', 'vid211', 'VID',
    'PP', 'PP12',
    '',
    'CHS003B',
    '10147605',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-6', 'VID212', 'vid212', 'VID',
    'PP', 'PP12',
    '',
    'CHS003B',
    '10147606',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-7', 'VID213', 'vid213', 'VID',
    'PP', 'PP12',
    '',
    'CHS200D',
    '10426709',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-8', 'EH212', 'eh212', 'Elevator & Hopper',
    'PP', 'PP12',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-9', 'PAC213', 'pac213', 'INSERT MACA (IRV24) 5.1',
    'PP', 'PP12',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-10', 'PAC214', 'pac214', 'INSERT MACA (IRV24) 5.2',
    'PP', 'PP12',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-11', 'PAC219', 'pac219', 'INSERT MACA (IRV24) 5.3',
    'PP', 'PP12',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-12', 'LASER007', 'laser007', 'LASER 28STD 5.1',
    'PP', 'PP12',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-13', 'LASER008', 'laser008', 'LASER 28STD 5.2',
    'PP', 'PP12',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-14', 'LASER009', 'laser009', 'LASER 28STD 5.3',
    'PP', 'PP12',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP12-15', 'OTHER-PP12-15', 'other-pp12-15', 'Other PP1 L 12',
    'PP', 'PP12',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP13-1', 'PRS209', 'prs209', '6 Die Press MUB 22.STD',
    'PP', 'PP13',
    'MUB',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP13-2', 'ROL213', 'rol213', 'Rolling R2S',
    'PP', 'PP13',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP13-3', 'ROL214', 'rol214', 'Rolling R2S',
    'PP', 'PP13',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP13-4', 'LNR201', 'lnr201', 'Liner Toyoza L2S',
    'PP', 'PP13',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP13-5', 'LAS002', 'las002', 'LASER FOBA (Y.0500-fc)',
    'PP', 'PP13',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP13-6', 'LASER013', 'laser013', 'LASER 22STD',
    'PP', 'PP13',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP13-7', 'VID202', 'vid202', 'VID',
    'PP', 'PP13',
    '',
    'CHS202A',
    '10441625',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP13-8', 'SLT203', 'slt203', 'Slitter SLR',
    'PP', 'PP13',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.359Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP13-9', 'SLT202', 'slt202', 'Slitter SLR',
    'PP', 'PP13',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.359Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP13-10', 'SLT204', 'slt204', 'Slitter SLR',
    'PP', 'PP13',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP13-11', 'OTHER-PP13-11', 'other-pp13-11', 'Other PP1 L 13',
    'PP', 'PP13',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP14-1', 'PRS212', 'prs212', '6 Die Press MUB 28.SHL',
    'PP', 'PP14',
    'MUB',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP14-2', 'EHL14', 'ehl14', 'Elevator & Hopper',
    'PP', 'PP14',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP14-3', 'ROL216', 'rol216', 'Rolling R8L',
    'PP', 'PP14',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP14-4', 'ROL217', 'rol217', 'Rolling R8L',
    'PP', 'PP14',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP14-5', 'TTL214', 'ttl214', 'TURN TABLE',
    'PP', 'PP14',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP14-6', 'LNR205', 'lnr205', 'Liner Toyoza M-2801 Modifly P2/48',
    'PP', 'PP14',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP14-7', 'VID203', 'vid203', 'VID',
    'PP', 'PP14',
    '',
    'CHS005D',
    '10365968',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP14-8', 'AC214', 'ac214', 'AIR CHUTE',
    'PP', 'PP14',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP14-9', 'CH47', 'ch47', 'CAP HOPPER',
    'PP', 'PP14',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP14-10', 'CN214', 'cn214', 'COUNTER',
    'PP', 'PP14',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP14-11', 'OTHER-PP14-11', 'other-pp14-11', 'Other PP1 L 14',
    'PP', 'PP14',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP15-1', 'PRS213', 'prs213', '6 Die Press MUB 28SHL2',
    'PP', 'PP15',
    'MUB',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP15-2', 'EH215', 'eh215', 'Elevator & Hopper',
    'PP', 'PP15',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP15-3', 'ROL218', 'rol218', 'Rolling R8L',
    'PP', 'PP15',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP15-4', 'ROL219', 'rol219', 'Rolling R8L',
    'PP', 'PP15',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP15-5', 'ROL209', 'rol209', 'Rolling R8L',
    'PP', 'PP15',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP15-6', 'TT215', 'tt215', 'TURN TABLE',
    'PP', 'PP15',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP15-7', 'LNR206', 'lnr206', 'Liner Toyoza M-4 P1/24',
    'PP', 'PP15',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP15-8', 'LASER001', 'laser001', 'LASER 28SHL2',
    'PP', 'PP15',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP15-9', 'VID204', 'vid204', 'VID',
    'PP', 'PP15',
    '',
    'CHS005D',
    '10365964',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP15-10', 'OTHER-PP15-10', 'other-pp15-10', 'Other PP1 L 15',
    'PP', 'PP15',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP16-1', 'PRS219', 'prs219', 'MUB COMPOSITE LINE 2',
    'PP', 'PP16',
    'MUB',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP16-2', 'ROL223', 'rol223', 'Rolling R8L',
    'PP', 'PP16',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP16-3', 'LNR209', 'lnr209', 'TOYOZA MOLDED PE 28STD',
    'PP', 'PP16',
    '',
    '',
    '',
    '',
    '',
    'ต่ำ',
    'ปลดระวาง',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-17T04:19:58.742Z',
    'unknown',
    1,
    2,
    '61f5ae0a-297f-40c3-8b7c-71bfbd057152'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP16-4', 'VID201', 'vid201', 'VID',
    'PP', 'PP16',
    '',
    'CHS005D',
    '10219270',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP16-5', 'OTHER-PP16-5', 'other-pp16-5', 'Other PP1 L 16',
    'PP', 'PP16',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-01', 'PRS222', 'prs222', 'PRESS SACMI#6',
    'PP', 'PP18',
    'SACMI',
    '',
    '10301764',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-02', 'LNR208', 'lnr208', 'TOYOZA 6.1',
    'PP', 'PP18',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-03', 'LNR213', 'lnr213', 'TOYOZA 6.2',
    'PP', 'PP18',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-04', 'ROL227', 'rol227', 'ROLLING 6.1',
    'PP', 'PP18',
    '',
    '',
    '10300390',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-05', 'ROL228', 'rol228', 'ROLLING 6.2',
    'PP', 'PP18',
    '',
    '',
    '10300389',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-06', 'VID209', 'vid209', 'VID6.1',
    'PP', 'PP18',
    '',
    'CHS200D',
    '10417603',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-07', 'VID210', 'vid210', 'VID6.2',
    'PP', 'PP18',
    '',
    'CHS200D',
    '10417604',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-08', 'LAS203', 'las203', 'LASER  HAN 15Wat SACMI#6',
    'PP', 'PP18',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-09', 'LASER005', 'laser005', 'LASER 28STD 6.1',
    'PP', 'PP18',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-10', 'LASER006', 'laser006', 'LASER 28STD 6.2',
    'PP', 'PP18',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-11', 'PAC201', 'pac201', 'Packing L85 SACMI#6',
    'PP', 'PP18',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-12', 'PAC202', 'pac202', 'Packing L85 SACMI#6',
    'PP', 'PP18',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP18-13', 'OTHER-PP18-13', 'other-pp18-13', 'Other PP1 L 18',
    'PP', 'PP18',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-00', 'PRS223', 'prs223', 'PRESS SACMI#4',
    'PP', 'PP19',
    'SACMI',
    '',
    '10301765',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-01', 'EH219', 'eh219', 'Elevator & Hopper',
    'PP', 'PP19',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-02', 'ROL229', 'rol229', 'ROLLING 4.1',
    'PP', 'PP19',
    'MACA',
    'MACA-510A',
    '510A',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-16T14:34:03.426Z',
    'eercsc@gmail.com',
    1,
    2,
    'd86dcafa-6d99-485c-add0-47e9233ae672'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-03', 'ROL230', 'rol230', 'ROLLING 4.2',
    'PP', 'PP19',
    'MACA',
    'MACA-510B',
    '510B',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-04', 'ROL231', 'rol231', 'ROLLING 4.3',
    'PP', 'PP19',
    'MACA',
    'MACA-510C',
    '510C',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-05', 'TT219A', 'tt219a', 'TURN TABLE C2',
    'PP', 'PP19',
    '',
    '',
    'C2',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-06', 'TT219B', 'tt219b', 'TURN TABLE C4',
    'PP', 'PP19',
    '',
    '',
    'C4',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-07', 'TT219C', 'tt219c', 'TURN TABLE C6',
    'PP', 'PP19',
    '',
    '',
    'C6',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-08', 'LNR210', 'lnr210', 'TOYOZA หาง A',
    'PP', 'PP19',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-09', 'LNR211', 'lnr211', 'TOYOZA หาง B',
    'PP', 'PP19',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-10', 'LNR212', 'lnr212', 'TOYOZA หาง C',
    'PP', 'PP19',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-11', 'HB219A', 'hb219a', 'Hopper/Blower C3',
    'PP', 'PP19',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-12', 'HB219B', 'hb219b', 'Hopper/Blower C5',
    'PP', 'PP19',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-13', 'HB219C', 'hb219c', 'Hopper/Blower C7',
    'PP', 'PP19',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-14', 'LASER010', 'laser010', 'LASER 28SHL4/A',
    'PP', 'PP19',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-15', 'LASER011', 'laser011', 'LASER 28SHL4/B',
    'PP', 'PP19',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-16', 'LASER012', 'laser012', 'LASER 28SHL4/C',
    'PP', 'PP19',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-17', 'VID215', 'vid215', 'VID4.1',
    'PP', 'PP19',
    'SACMI',
    'CHS005D',
    '10356560',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-18', 'VID216', 'vid216', 'VID4.2',
    'PP', 'PP19',
    'SACMI',
    'CHS005D',
    '10356561',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-19', 'VID217', 'vid217', 'VID4.3',
    'PP', 'PP19',
    'SACMI',
    'CHS005D',
    '10365967',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP19-20', 'OTHER-PP19-20', 'other-pp19-20', 'Other PP1 L 19',
    'PP', 'PP19',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP20-00', 'PRS224', 'prs224', 'PRESS SACMI#7',
    'PP', 'PP20',
    'SACMI',
    '',
    '10344349',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP20-01', 'ROL232', 'rol232', 'ROLLING 7.1',
    'PP', 'PP20',
    'MACA',
    'BLV14/B',
    '546A-B',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP20-02', 'ROL233', 'rol233', 'ROLLING 7.2',
    'PP', 'PP20',
    'MACA',
    'BLV14/B',
    '545A-B',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP20-03', 'VID207', 'vid207', 'VID7.1',
    'PP', 'PP20',
    '',
    'CHS005D',
    '10324402',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP20-04', 'VID208', 'vid208', 'VID7.2',
    'PP', 'PP20',
    '',
    'CHS005D',
    '10324403',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP20-05', 'EH220', 'eh220', 'Elevator & Hopper',
    'PP', 'PP20',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP20-06', 'PAC217', 'pac217', 'INSERT MACA (IRV30) 7.1',
    'PP', 'PP20',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP20-07', 'PAC218', 'pac218', 'INSERT MACA (IRV30) 7.2',
    'PP', 'PP20',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP20-08', 'LASER003', 'laser003', 'LASER 28STD7.1',
    'PP', 'PP20',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP20-09', 'LASER004', 'laser004', 'LASER 28STD7.2',
    'PP', 'PP20',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP20-10', 'OTHER-PP20-10', 'other-pp20-10', 'Other PP1 L 20',
    'PP', 'PP20',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP21-00', 'PRS225', 'prs225', 'MUB PRESS 28IR2',
    'PP', 'PP21',
    'MUB',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP21-01', 'LNR220', 'lnr220', 'TOYOZA 28IR2',
    'PP', 'PP21',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP21-02', 'EH221', 'eh221', 'Elevator & Hopper',
    'PP', 'PP21',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP21-03', 'ROL235', 'rol235', 'Rolling 28 Intermediate',
    'PP', 'PP21',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP21-04', 'TT221', 'tt221', 'TURN TABLE',
    'PP', 'PP21',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP21-05', 'AC221', 'ac221', 'AIR CHUTE',
    'PP', 'PP21',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP21-06', 'HOP221', 'hop221', 'HOPPER AND BLOWER',
    'PP', 'PP21',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP21-07', 'VID205', 'vid205', 'PP.CAP OFF LINE 1',
    'PP', 'PP21',
    '',
    'CHS202A',
    '10495720',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'PP21-08', 'OTHER-PP21-08', 'other-pp21-08', 'Other PP1 L 21',
    'PP', 'PP21',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP00-00', 'PC1000', 'pc1000', 'PC - Plastic Cap : Center',
    'PC', 'CP00',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP00-01', 'PC5000', 'pc5000', 'PT - Composit : Center',
    'PC', 'CP00',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP03-01', 'CCM408', 'ccm408', 'CCM408-CCM7000S',
    'PC', 'CP03',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP03-02', 'INV405', 'inv405', 'Inverting & Scoring 5',
    'PC', 'CP03',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP03-03', 'PRP406', 'prp406', 'Outside Printer Line 5 (KOHOKU2)',
    'PC', 'CP03',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP03-04', 'VID005', 'vid005', 'VEDIO SENSER.5',
    'PC', 'CP03',
    'SACMI',
    '',
    '10221976',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP03-05', 'LAS01', 'las01', 'LASER.1',
    'PC', 'CP03',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP03-06', 'OTHER-CP03-06', 'other-cp03-06', 'CCM408-CCM7000S',
    'PC', 'CP03',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP04-01', 'CCM404', 'ccm404', 'CCM 60H.3',
    'PC', 'CP04',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP04-02', 'CCM405', 'ccm405', 'CCM 60H.4',
    'PC', 'CP04',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP04-03', 'FDR403', 'fdr403', 'FEEDER COVEYOR',
    'PC', 'CP04',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP04-04', 'HOP403', 'hop403', 'HOPPER 403',
    'PC', 'CP04',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP04-05', 'INV403', 'inv403', 'Inverting & Scoring 3',
    'PC', 'CP04',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP04-06', 'PRP404', 'prp404', 'Outside Printing M/C No.3 Line 2',
    'PC', 'CP04',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP04-07', 'BC403', 'bc403', 'Blower & Conveyor',
    'PC', 'CP04',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP04-08', 'ELE403', 'ele403', 'ELEVATOR CONTROL',
    'PC', 'CP04',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP04-09', 'VID003', 'vid003', 'VEDIO SENSER.1',
    'PC', 'CP04',
    'SACMI',
    '',
    '10301721',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP05-01', 'CCM407', 'ccm407', 'CCM Sacmi.1',
    'PC', 'CP05',
    'SACMI',
    '',
    '10132131',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.360Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP05-02', 'INV404', 'inv404', 'Inverting & Scoring ( Sacmi )',
    'PC', 'CP05',
    'SACMI',
    '',
    '10132048',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.360Z',
    'import',
    '2026-09-20T14:49:57.361Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP05-03', 'PRP405', 'prp405', 'Outside Printer Line 4 (KOHOKU)',
    'PC', 'CP05',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.361Z',
    'import',
    '2026-09-20T14:49:57.361Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP05-04', 'VID004', 'vid004', 'VEDIO SENSER.4',
    'PC', 'CP05',
    'SACMI',
    '',
    '10150059',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.361Z',
    'import',
    '2026-09-20T14:49:57.361Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP06-01', 'CCM410', 'ccm410', 'CCM48SC SACMI (CSD8)',
    'PC', 'CP06',
    'SACMI',
    '',
    '10244014',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.361Z',
    'import',
    '2026-09-20T14:49:57.361Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP06-02', 'INV407', 'inv407', 'FLODING&SCORING MACHINE (SACMI)',
    'PC', 'CP06',
    'SACMI',
    '',
    '10230781',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.361Z',
    'import',
    '2026-09-20T14:49:57.361Z',
    'import',
    1,
    1,
    'import-init'
  );

INSERT OR REPLACE INTO machines (
    id, code, normalized_code, name, department_id, line_id,
    manufacturer, model, serial_no, machine_type,
    install_date, criticality, status, location_detail,
    photo_file_id, photo_file_name, manual_url, remark,
    created_at, created_by, updated_at, updated_by,
    is_active, version, request_id
  ) VALUES (
    'CP06-03', 'PRP407', 'prp407', 'Outside Printer Line 4 (CSD) (KOHOKU3)',
    'PC', 'CP06',
    '',
    '',
    '',
    '',
    '',
    'กลาง',
    'ใช้งาน',
    '',
    '',
    '',
    '',
    '',
    '2026-09-20T14:49:57.361Z',
    'import',
    '2026-09-20T14:49:57.361Z',
    'import',
    1,
    1,
    'import-init'
  );

PRAGMA foreign_keys = ON;