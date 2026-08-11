-- Generated from dautoeic/mock_test_data/all_questions.csv.
-- Idempotently fills only missing Part 2 English question text.
SET NAMES utf8mb4;

DROP TEMPORARY TABLE IF EXISTS migration_part2_question_text_20260811;
CREATE TEMPORARY TABLE migration_part2_question_text_20260811 (
    question_id VARCHAR(100) NOT NULL PRIMARY KEY,
    question_text MEDIUMTEXT NOT NULL
) ENGINE=InnoDB;

INSERT INTO migration_part2_question_text_20260811 (question_id, question_text) VALUES
    ('1fab289e-0a5f-4ad7-96a6-882b74056f38', 'M-Au: Where is the parking garage?
W-Am:'),
    ('f2de72ca-149b-4ac5-bc25-dd682923a2ef', 'W-Br: When will the design team meet?
W-Am:'),
    ('b1cc16c2-ddaa-4746-b41c-ce45b79427e8', 'W-Am: Should we consider Anita for the accountant position?
M-Au:'),
    ('23dfe7ba-d9e5-4c9f-9f11-cff2143b86ec', 'M-Cn: What are they building near the shopping center?
W-Br:'),
    ('9d1035cf-5ad5-4751-828b-a53104c99af9', 'W-Am: How did you like the meal?
M-Cn:'),
    ('2042e50c-65ff-4014-9347-af09b2447302', 'W-Br: Why did the manager e-mail you?
W-Am:'),
    ('3d95545a-7f2e-489d-87c2-0d7e1d9a9da5', 'M-Cn: Will the prototype be ready in time for the trade show?
M-Au:'),
    ('4dc327e2-aabf-4637-a38a-1f6cc6b0b73b', 'M-Cn: Our office building is locked on the weekends, isn''t it?
W-Br:'),
    ('83a37345-a9d2-44ad-887b-6f125628cbba', 'W-Am: Can''t you deliver both of these orders during the same trip?
M-Au:'),
    ('ffe3bd08-44da-4544-a402-696b74d48862', 'M-Au: Do you want to purchase a laptop or desktop computer?
W-Br:'),
    ('ebf22a25-f362-4825-a748-fd645f4bcb13', 'W-Am: What did you think of the company newsletter?
M-Au:'),
    ('bbd19479-f151-49d0-86f3-954060c1c12d', 'W-Br: Can I help you move your furniture?
M-Cn:'),
    ('138ee93e-ac18-42b9-b101-e6d342cacbc8', 'M-Au: Why did Mr. Harrison resign from his position?
W-Am:'),
    ('42bfdcd5-7571-4f24-baf7-cecdc5c0311b', 'M-Cn: Which client are we meeting with tomorrow morning?
M-Au:'),
    ('f1ab7681-808d-4aba-8229-14311ac07148', 'W-Br: Weren''t those lightbulbs replaced recently?
M-Cn:'),
    ('bebc8fa4-a8c3-4d2c-ba8d-a96616512cd2', 'W-Am: Who knows how to start the conference call?
M-Cn:'),
    ('e70b3366-c492-4bab-8ed7-631e6ba94687', 'W-Br: What should I do with the extra training materials?
M-Au:'),
    ('05ae4fe7-c55e-4d22-bc8c-ef2d2a52c3a6', 'M-Cn: It''s raining quite hard outside.
W-Br:'),
    ('06ab8ba5-f3c6-4266-9623-ae089f34b7fd', 'W-Br: How many servers do we need waiting tables on Saturday?
M-Cn:'),
    ('1028cdf5-41f5-4ade-9667-ed24316a89c4', 'W-Am: George, will you call our clients back?
M-Cn:'),
    ('89b6212b-d148-43d4-a353-694858248377', 'M-Au: Our quarterly sales results were lower than expected.
W-Br:'),
    ('1009f2e2-e0d0-457b-b309-4490ce969c5e', 'M-Cn: When do you want to work on this new project?
W-Am:'),
    ('253dcc2d-6cba-4eba-b98c-9d21f751973a', 'W-Br: I''ll be happy to take pictures at the company retreat.
M-Cn:'),
    ('e9753e14-530d-494b-b88b-da2e396ae5ad', 'M-Au: These all-weather tires are very expensive.
W-Br:'),
    ('de0b87c0-1c4b-4ae0-97c2-1abb93e891ae', 'M-Au: Why aren''t the trainees in the computer lab now?
W-Am:'),
    ('22d54689-e260-4e58-aca2-b9892c342b26', 'Have the machines on the factory floor been cleaned?'),
    ('f7c126f7-2867-457a-9311-b0880fb082ce', 'How much will the budget increase next year?'),
    ('d7fea338-42eb-4419-b13b-1ad1fc84e043', 'You’re going to water the plants before you leave, aren’t you?'),
    ('212a5a8a-402b-40de-aebe-5c20121453f9', 'Aren’t you going to schedule an eye doctor appointment?'),
    ('758543f3-c18c-4555-a600-bc65cff12922', 'I’m going to try to fix this printer.'),
    ('2a8046aa-77a0-42d8-9c60-44567764eb91', 'What should we do with these brochures?'),
    ('5e2b7f89-ffdb-48b1-b93c-70c591d6f932', 'Has the policy meeting been rescheduled?'),
    ('e6d4bb34-5eb0-4c86-9fd9-ff19c7c58544', 'Why don’t we stop by the office cafeteria on our way to the workshop?'),
    ('0e09fd67-4c6f-4b00-ac08-f02fed681c8b', 'Have you tried our famous pasta dish?'),
    ('10909163-4f9f-40b5-b1b3-d50e394d1c3f', 'Who’s the opening act at tonight’s concert?'),
    ('62b0da3a-b75e-49ee-bbbd-3cf910bf62ea', 'When do the product demonstrations start?'),
    ('29a321ae-2440-40b3-9d3e-188a163df601', 'I tried updating the Web site, but it didn''t work.'),
    ('18e9bfb5-a38f-4d92-8436-146ca79bccb6', 'Did you hire a new welding specialist?'),
    ('88c39ece-2c91-4845-ba43-6b8efd3fe1a4', 'How was the color palette for the lobby chosen?'),
    ('103b32a2-2da6-43a5-8e3d-a40925d2495f', 'When are we ordering more supplies for the office?'),
    ('875b46f0-d14a-410f-9d4a-4977b2e0ffba', 'The battery for the water pump is going to be solar powered, right?'),
    ('521c2963-d6fb-496f-a52d-57ee62481ec6', 'Where can I buy a charger for this laptop?'),
    ('a972dd3f-3ed0-4795-8399-7bd8fa05e30e', 'Do l need to reserve a meeting room?'),
    ('dac88c20-d34e-49f4-9867-411802f0b12a', 'When’s the new department director supposed to start?'),
    ('ae2f7625-fe6c-42de-81a5-70a6a702690d', 'Should I deliver these pizzas, or will you?'),
    ('62f22f65-c1ec-40c6-950b-aec5ee8a2309', 'This month’s shipment schedule has been revised.'),
    ('7843a7b0-6708-42a3-89f6-8bda04eb5493', 'How much will the repairs cost?'),
    ('fc664fbd-e99e-4db8-b41d-332f4ab91c38', 'Why don’t we provide more samples of the wallpaper patterns?'),
    ('90886e73-6973-4df6-b5d5-b00e1f570d19', 'Can you give me a tour of the property this afternoon?'),
    ('b1ac13ca-b79b-4d85-aa97-7900e4ddf1e1', 'Who’s scheduled to test the product today?'),
    ('e86a8a40-cb71-4838-852a-2eba3eda576a', 'W-Am: Which shoes are on sale this weekend?
M-Au:'),
    ('16edc932-cd47-47e7-a875-1e336cc42932', 'M-Cn: Would you like to pay for the cake now or when it''s delivered?
W-Br:'),
    ('6f55932f-c102-4524-a24b-a2e185255456', 'M-Au: Doesn''t Thomas usually work the evening shift?
W-Am:'),
    ('45267dd6-19e7-4eb9-ac7e-b1a29b4d3ecc', 'W-Br: Who came up with the idea for the new commercial?
M-Au:'),
    ('d843ad79-b63a-4ad9-b27f-c8b731d2ce85', 'W-Am: Could we start the orientation meeting a bit later?
M-Au:'),
    ('22560d7e-080a-4023-a45c-d96a00c87e42', 'M-Au: When are we getting our paychecks?
W-Am:'),
    ('15e28a89-6c49-458b-af49-40b575d0a92e', 'W-Am: Did we decide on the large catering order or the small one?
M-Au:'),
    ('d8a2507e-977a-4670-964d-3023132c8f40', 'M-Cn: How do I sign up for the ten-kilometer race?
W-Br:'),
    ('56f8489d-b944-4d83-b425-2372b797986a', 'W-Br: Didn''t I submit my references online?
M-Cn:'),
    ('0873b766-fff5-414b-acac-083f550f09d8', 'W-Am: What will the keynote speaker talk about at the conference?
M-Au:'),
    ('b17adece-92b8-4783-8ac5-7974e01e6ab0', 'M-Au: Where is the closest pharmacy?
M-Cn:'),
    ('774b99ff-43a8-4a4d-85ba-636af827491d', 'W-Br: Why are your travel expenses so high?
M-Au:'),
    ('631361a2-6397-42ea-b1bb-1b844c5d8a57', 'M-Cn: Have you looked at the designs for the book cover?
W-Br:'),
    ('0c03ab9b-ded2-407f-808a-d3f58d53a061', 'W-Am: When are the new employees starting?
M-Cn:'),
    ('4b534076-c396-4a1e-ac9a-ad05f61eab81', 'M-Cn: Should I go on the morning flight or wait until the afternoon?
W-Br:'),
    ('45186a69-6a59-4daa-a240-d1270699c98c', 'W-Am: I saw a stain on the carpet in room 29.
M-Au:'),
    ('cfbd1944-7507-4148-aec8-8c823bb45fb1', 'M-Au: Why don''t we meet at the fitness center around seven thirty?
M-Cn:'),
    ('9932fc82-6609-4f02-b0c7-0688632dcbd3', 'M-Cn: Could you find me a hammer and some nails?
W-Am:'),
    ('0a910a2e-e1bd-4957-9791-cc870b4cc8bb', 'W-Br: Who was in the break room last?
M-Au:'),
    ('3baac1c7-d31b-4ed9-b718-9de5bbc11c6f', 'M-Cn: There''s a sale on electronics tomorrow.
M-Au:'),
    ('25197668-6e07-426c-bbd9-a6cd32ed7479', 'M-Au: Why hasn''t production started yet?
W-Am:'),
    ('f1360cf6-9b76-4327-a83e-673e0cc0ea42', 'W-Am: How do you want me to display the new products?
M-Au:'),
    ('4be05e57-95b7-4860-bd96-fc26de918b18', 'M-Cn: Where''s the instruction manual for the videoconferencing software?
W-Br:'),
    ('3809db4d-0575-47a9-9e1b-b51aa41cd1e4', 'M-Au: This mirror would look good in the corner, don''t you think?
W-Am:'),
    ('73ec746a-a6df-43a1-963c-e76596ff45cf', 'W-Br: You''re creating a schedule for the Madrid convention, right?
M-Cn:'),
    ('7546e105-d169-49d3-9ba8-1c94acb62971', 'W-Am: Did you buy a monthly parking pass?
M-Cn:'),
    ('0885dc19-e618-47f0-b055-febd0ce76b0c', 'W-Br: Where should we put the microwave oven?
W-Am:'),
    ('3ca2097e-2b2b-4fc9-b4fe-9bc15b194d99', 'M-Cn: Why can''t the vice president attend the meeting?
W-Br:'),
    ('6f3ca922-6730-457f-b3d4-6bbf3bf3c997', 'W-Br: Isn''t this the line for the theater''s box office?
M-Au:'),
    ('6e7f5709-3d38-4a96-9998-ccf43dd59acb', 'M-Au: When can I update your computer software?
W-Br:'),
    ('6eac4170-4714-46ad-a2f2-b9fb9fafdaac', 'W-Am: Nadia''s on a business trip in Germany, isn''t she?
M-Cn:'),
    ('c7c2e0fa-d5f1-408a-8b20-0c2b186f65e4', 'M-Au: How long does the legal team need to review the contracts?
W-Br:'),
    ('5c7050d9-28ff-459e-8fb5-c48679f97abf', 'M-Cn: Why don''t we hire another receptionist?
W-Am:'),
    ('462d0c92-5cb5-45ab-9116-d36043aba193', 'M-Cn: Have you finished the budget report, or are you still working on it?
M-Au:'),
    ('7c1095b1-51ba-4e69-a984-f7e934703ee0', 'W-Am: Are you training the new employees?
M-Cn:'),
    ('ff373241-bef5-4625-aa66-b1e7054a63de', 'W-Am: Can you call our Singapore office to confirm the client''s address?
M-Au:'),
    ('6a799b13-d8a5-4b14-9004-ecb469201669', 'W-Br: Who still needs to submit their travel receipts?
W-Am:'),
    ('4f55e0b6-e6fa-4556-a52f-66af763478c3', 'M-Cn: Why is our company Web site currently unavailable?
W-Am:'),
    ('8e81e2bb-adb5-494c-beca-81221bc72961', 'M-Au: Where will the interns be seated?
W-Br:'),
    ('3c67436f-1914-453e-9a30-d1613208964b', 'W-Br: What time does the train from Milan arrive?
M-Au:'),
    ('8b668712-5fd6-4c44-bba0-ec43cb993ddc', 'M-Cn: When can you complete the presentation?
W-Br:'),
    ('72ea4611-5540-47a0-bb9c-5f8915e31281', 'M-Au: The elevator needs to be repaired.
M-Cn:'),
    ('22a3a1dd-0e84-4524-a16e-92964ce6f8cd', 'W-Br: Let''s take our clients to the theater.
W-Am:'),
    ('b35392c2-b43a-4542-ba1f-5741a1cd39a1', 'W-Am: Have you tried our grilled vegetable platter?
M-Au:'),
    ('a54ba5ff-4a2a-4705-84ff-956af0c091e2', 'W-Am: How was last night''s dance performance?
M-Cn:'),
    ('bc1fe28a-2eb4-4848-930e-4cd4d6eaf728', 'M-Au: Why don''t we close the store early for the staff meeting?
W-Am:'),
    ('bf8451aa-9e3e-4865-b42e-7fcb90599926', 'M-Au: I need to find a new dentist.
W-Br:'),
    ('d53c8627-7837-4d3a-871b-c08b8407507a', 'M-Cn: Will your rent increase next year, or will it stay the same?
W-Am:'),
    ('54540771-9477-4883-808e-b1ffb6b4ee70', 'W-Br: Shouldn''t we post the job opening online?
M-Au:'),
    ('bd502065-212e-411f-9829-edc95f011bb0', 'M-Au: What does the timeline look like for the lobby renovations?
M-Cn:'),
    ('3b0aa322-ebec-4d5c-a299-c7d0867aed8c', 'Where''s the coffeemaker?'),
    ('9c356961-35dd-4f33-ab66-550c37a86746', 'Why are you calling the clients?'),
    ('880d8741-ebd2-4418-af4c-de6503244507', 'Would you like to attend our next company retreat?'),
    ('4f1e99aa-8871-4863-a30b-4bd01dce21c5', 'Who can update the Web site?'),
    ('30bf7c86-d955-4cd9-bd8f-23dd530f7e6a', 'Does your desk face the door or the window?'),
    ('79584e3a-5fa4-4283-b397-76bc3cb8b296', 'When will your performance take place?'),
    ('103f2e8c-7758-499a-9eb1-0acf61f93344', 'What will you get for completing the program?'),
    ('4147e022-0a45-4b7a-bec1-f525d0c331be', 'How did the company get its name?'),
    ('37d7cf48-47f1-4e4c-8dbd-9cd13697a5a9', 'Your kitchen looks nice painted in this shade of yellow.'),
    ('e1892b4d-a4d2-4596-9799-4f16df14ce7c', 'Are you considering hiring a public relations firm?'),
    ('89be66eb-5e28-48b2-9f2a-30a1108bea9f', 'Does this hallway lead to the lobby or to the courtyard?'),
    ('b3327b77-18b6-4da7-9514-63149a36d519', 'The company''s headquarters is in Houston, right?'),
    ('71518a63-0a7a-4313-83f0-6d24dbd256f3', 'Aren''t the windows in the warehouse supposed to be replaced?'),
    ('805ec27f-c838-4885-9db0-ac2375d34fae', 'Who''s leading the workshop on Friday?'),
    ('a766eb72-90d5-4d8b-b2b5-606870bfbba2', 'Should we join our department''s book club?'),
    ('265c8660-9612-4434-8ca1-7fc6a7fec7b2', 'Shouldn''t this package be returned?'),
    ('e7a02e8f-89e1-4dd1-9b8d-26386f6ca8d8', 'When will the training sessions for the new security measures take place?'),
    ('593d45d9-366f-4a43-a3c9-62532b5aa8df', 'Do you want the draft of the proposal e-mailed to you or printed out?'),
    ('0a4190c9-b2a8-4ab4-8504-755774233184', 'Which day is most convenient for you?'),
    ('86ed0fd5-191f-4327-81ab-a4f513e89433', 'Our department''s looking for more interns.'),
    ('ee553fdd-24e9-4d11-afb8-ab1d9aa3378c', 'How was your lunch at the park?'),
    ('baaef382-ebd5-4251-94a1-e0eebfef01e8', 'Does your company send out the same promotional material every month?'),
    ('1c773533-ba25-4a90-9124-8e113562a37d', 'Where can I look at floor plans for our new office building?'),
    ('cce9cc7c-8c1d-43c5-9e86-12759389f7f1', 'Can I use the company car to pick up the clients from the airport?'),
    ('1a7931d3-ad4a-4116-ba5b-de343ccad9d8', 'How often should our heating system be inspected?'),
    ('a87738eb-a439-4632-9464-690ef9f647fa', 'M-Au: What floor is the seminar on?
W-Am:'),
    ('3d955d94-b952-49b4-afeb-3ae9464a7627', 'W-Br: Where are the new printers being made?
M-Cn:'),
    ('57107e2c-0059-4840-8c74-107a4e183ae9', 'W-Am: Isn''t Takeshi coming to the concert with us?
M-Au:'),
    ('8ed1bbe7-5505-41db-ae6f-d5ced0f9266b', 'W-Am: When should we ship this order?
M-Cn:'),
    ('8fa0f08a-1a87-4860-bd13-a320c7a359ac', 'M-Au: The storage closet is locked, isn''t it?
W-Br:'),
    ('754aae69-e3be-48a0-9133-56e381254dff', 'W-Am: Do I need to use a microphone to give my speech?
M-Cn:'),
    ('d8b12b1b-58f9-4eae-b16c-68c779c1fe55', 'W-Br: Why did Marie leave early yesterday?
M-Cn:'),
    ('a09296f1-a8c8-4303-9116-b1412a89c169', 'W-Am: Would you like me to write up the contract now?
W-Br:'),
    ('dfa9c0c3-83a7-4738-8b54-12d88c3dd01d', 'M-Au: Can I borrow that book after you''re finished with it?
M-Cn:'),
    ('a17581f8-88bb-4b83-b406-6eadf3de5dd7', 'W-Am: Who''s responsible for booking Mr. Chung''s flights?
M-Cn:'),
    ('d5261072-750e-4211-8a93-78d15d171c7c', 'W-Br: Have we been selling more orange juice or apple juice?
W-Am:'),
    ('65dce282-6f03-4a48-b98e-b73e3f920beb', 'W-Br: When is the new intern''s first day?
M-Au:'),
    ('fcc42099-1b93-42ae-b5d6-0330fad7de2c', 'M-Cn: Has Ms. Medrano been to the doctor''s office yet?
W-Am:'),
    ('59c65851-c03d-4cc5-86f8-b014a8e25c99', 'M-Cn: Would you like indoor or outdoor seating?
W-Br:'),
    ('da57f9cd-2612-4b7a-955a-8498bdeb0675', 'W-Am: Ms. Balani has the copies of the annual report, doesn''t she?
M-Au:'),
    ('58754513-5fee-4c57-9d43-5d90df169d5d', 'M-Cn: What do you think of the updated vacation policy?
M-Au:'),
    ('35e753b6-deef-4fcc-b810-1315457a32d2', 'M-Cn: Didn''t Emir move to the corner office?
W-Am:'),
    ('25104bd5-bb87-470a-91d7-77f23fe502af', 'W-Br: Can we hire more staff?
M-Au:'),
    ('c83b7046-bee8-478a-921c-3735d21a2104', 'M-Cn: How do you turn on the air-conditioning in this office?
W-Br:'),
    ('27a4f59d-834e-4369-ba1e-d6564e3594d8', 'M-Au: This e-mail from Mr. Robertson is rather unclear.
W-Br:'),
    ('e813879e-3300-47ab-a40c-ce4abc29ae97', 'M-Au: What was the topic of yesterday''s workshop?
W-Am:'),
    ('89005499-a7a7-44c6-85fc-e704ad981bc3', 'W-Br: Why don''t we finish discussing this after lunch?
M-Au:'),
    ('191a6235-db08-4666-8956-0ed1f2b782e4', 'M-Cn: Could you work my shift on Monday night?
W-Br:'),
    ('a63b45c5-9bd5-49ec-ba87-fae052d08d2b', 'M-Au: I just received the weekly marketing report.
W-Br:'),
    ('82a7dc1d-f6bb-4106-a6af-3f93d8a067b0', 'M-Cn: Have the maintenance workers fixed the water leak in apartment 7B?
W-Am:'),
    ('5b7ecbdb-d5ea-4485-86c1-95ac543526b9', 'W-Am When will you deliver the furniture I ordered?
M-Au'),
    ('4991a27f-ac64-4bbc-976b-3ab415851368', 'W-Br Is your flight tomorrow or this afternoon?
M-Cn'),
    ('8358b58e-a28d-4961-a0a4-63e6797fbd1d', 'M-Cn How often does the research team schedule training sessions?
W-Br'),
    ('11c6b123-000c-47fb-89ed-32bdd20eb0c3', 'W-Am Can I pay my bill with a credit card?
M-Au'),
    ('c8e0ef35-385e-4cb6-a0cd-3e15b21a21ca', 'M-Cn The project proposal still needs work.
W-Br'),
    ('4461aa5a-df88-4467-8366-b0b04962d50d', 'W-Am Where do you plan to stay during your visit to the city?
M-Cn'),
    ('d2fa1fac-b3c9-4a51-b98a-5354725c09b4', 'M-Au How did you improve the processing speed?
w-Br'),
    ('da803386-9c23-4abc-b544-073817e7655b', 'W-Am Do you take exercise classes too, or just dance classes?
M-Cn'),
    ('090900ac-ea99-44c1-b66b-14dd779ad508', 'M-Cn When will the new coffee machine be installed in the lobby?
w-Am'),
    ('e721e96c-841f-4a0e-af1d-9f2a52d1f100', 'W-Am The new marketing director will be hired soon, won''t she?
M-Cn'),
    ('01bd62a7-8f9a-4b0e-87b4-a8de8ca0fc6e', 'M-Au I really need some help with the presentation graphics.
W-Br'),
    ('fef5dc3d-7834-4e94-83f2-19d2c34122a1', 'W-Am Who can I talk to about scheduling a haircut?
W-Br'),
    ('4fc88306-b44f-48eb-94d4-488e0776b44b', 'W-Br Did you already prepare the agenda for the department meeting?
M-Au'),
    ('f6e29126-3443-4ab1-ae42-991bbe0a5586', 'Do you take your coffee with or without milk?'),
    ('e8ab0ee7-8371-43c9-95f8-1a4bce1e019e', 'M-Au Why are you installing new software?
M-Cn'),
    ('edc409e1-7a1c-4bec-a576-d53a687389e3', 'W-Am When will next month’s cost projections be ready?
W-Br'),
    ('d1ee293f-b131-47aa-92cf-8155f3e6bd62', 'M-Au Would you ask Tae-Joon to help set up the product display?
M-Cn'),
    ('e4c83ad0-1353-4de6-9e38-cd976a5fa02b', 'W-Am Which version of the contract do you have?
M-Au'),
    ('9c9975aa-d371-42c7-91f5-b6bf3cc99bcd', 'W-Br Why isn’t Ms. Pérez here yet?
W-Am'),
    ('165cc89d-45ce-47f8-b56d-18c6e1b480ec', 'M-Au I heard that our company might be merging with another one.
M-Cn'),
    ('19478d77-decc-4e94-9e03-b948f83f6ee0', 'W-Br Could you ask the next patient to come in?
M-Au'),
    ('5ad82d83-c2e7-479f-949b-a6da4db92217', 'M-Au Are the blueberries ready to harvest?
W-Am'),
    ('5afddada-2919-4c6b-9999-2e3dc93ad368', 'M-Cn How long will it take us to get to the theater?
W-Br'),
    ('414a3840-1e3a-407d-9ea8-4262a3e7ec28', 'Are you going to send a report or give a presentation to our clients?'),
    ('c624ebd5-bffd-4d98-bd7a-45bfb589b719', 'W-Am When should we hang up the posters for our conference?
W-Br'),
    ('4d8cbdf3-a979-4e1c-b328-28aee225ce5e', 'W-Br: Who wants to organize the patient files?
M-Au:'),
    ('ceb72aee-e363-470a-8904-3bc9577fe789', 'W-Am: Why didn''t Miranda shut down the computers yesterday?
M-Cn:'),
    ('8a306803-c03d-4e15-a155-a6ced4ccfc44', 'M-Au: Would you like the pie or the pudding for dessert?
W-Br:'),
    ('bf48a8ff-1adc-4276-b62c-79d10158faf2', 'M-Cn: Didn''t you read Mr. Kim''s memo?
M-Au:'),
    ('e127c83c-1e8c-4c8a-b7fd-3c5597a18f04', 'W-Br: We can put a seafood dish on the menu, can''t we?
W-Am:'),
    ('8a489460-fa23-4ab4-989b-0e3502cf80b2', 'W-Am: Who managed the flower store last year?
M-Cn:'),
    ('2eadd36d-9e18-4bd9-86e3-f5fb22a4a149', 'W-Br: Do you mind filling out our customer-satisfaction survey?
M-Au:'),
    ('a6adfa82-5866-4816-9656-14a785a4b80a', 'M-Cn: Why aren''t those workers wearing their uniforms?
W-Br:'),
    ('1007b237-0fbc-46e9-b8ab-88700a6cc858', 'M-Au: Do you want me to ask Jake about the report?
W-Br:'),
    ('4ec9da09-b1e4-491c-ba01-347f8e3121bc', 'W-Br: Should I display the data on a chart or on a graph?
W-Am:'),
    ('5d1db3fa-862c-458e-8402-33aaf161d81c', 'W-Am: Where can I get breakfast near this hotel?
M-Au:'),
    ('c3036606-571a-45bb-94d6-6cf868d77e0d', 'M-Au: What was our net profit for the second quarter?
W-Am:'),
    ('98e9bcd1-2a6e-4609-a151-4fc2ef24df14', 'M-Cn: Why don''t you check the prices at a different paint store?
W-Br:'),
    ('25ad97d3-4d88-4870-9baf-4f46b8f5a8bd', 'M-Au: When will the presentation begin?
W-Am:'),
    ('7a72fda7-20bb-4c91-bde7-3f9d63aa2802', 'W-Br: We''re trying to cut our delivery times.
M-Cn:'),
    ('cce667d7-4f74-40b5-a4bc-2b7ef272513e', 'M-Cn: How much juice should I buy for the staff meeting?
W-Br:'),
    ('5555e85c-b525-467c-9423-890e048dadbc', 'W-Br: Shouldn''t you have left for your trip already?
M-Au:'),
    ('d84effdc-fdc2-4189-802a-534fa13ecbf4', 'W-Br: Has the warranty expired for our solar-powered lights?
M-Cn:'),
    ('f888c615-5806-4972-97b8-8da805af5bab', 'W-Am: You''ve placed the supply order, haven''t you?
M-Au:'),
    ('803438ad-5f97-46e9-8c56-167d66b1d32a', 'M-Cn: When are you showing your clients the house on Bell Street?
W-Am:'),
    ('9d356626-92b8-42bf-a306-48d028303bda', 'M-Au: How long will the building addition take to complete?
W-Br:'),
    ('e0be881c-6d56-4077-8a6b-0b115cb0f77d', 'M-Au: Which envelope should I use to mail these photos?
W-Am:'),
    ('6d984056-2555-47d6-9ea4-93ddde5687fc', 'M-Cn: The quality-control team is inspecting the factory soon.
W-Am:'),
    ('b66d7d43-c83f-468f-823c-8dab93ab26ce', 'M-Cn: Where''s the nearest bus stop?
W-Br:'),
    ('a7656545-d24b-45fd-8ed2-ababe15ce6d8', 'M-Au: Could I come to your office today to sign the rental contract?
W-Am:'),
    ('24ebe546-5a19-4697-9a3a-427ffa6ef299', 'M-Cn: When does the shop close?
W-Am:'),
    ('390b1e1a-e4f4-43a1-a5d6-faaa6a7c3dcf', 'W-Br: Who''s scheduled to clean the kitchen?
M-Cn:'),
    ('5d0cc11c-4dbc-423c-b063-51c646e7f549', 'M-Au: How will we get to the hotel from the airport?
W-Br:'),
    ('817a5195-6c15-4917-921c-a43197354b86', 'W-Am: Is Teresa out of the office today?
M-Au:'),
    ('1025af84-0ea0-49d1-9b39-5f1af7324e2b', 'M-Cn: Which food supplier do you use?
W-Br:'),
    ('570df15b-689f-4dc6-b343-f336ce134b95', 'W-Am: Could you help me set up this window display?
M-Au:'),
    ('c737959e-11aa-406f-942c-5e7b75639a70', 'W-Br: Why is this package here?
M-Au:'),
    ('b39a91c8-0d2d-4559-b778-e2e023a9fa3e', 'M-Cn: Which menu item do you recommend?
W-Br:'),
    ('86e08f98-6c45-4346-8120-da8fa053df7c', 'M-Au: Do you know who requested technical support?
W-Br:'),
    ('d6321b06-870c-4445-adb4-126da5e9f788', 'W-Am: Where does Takumi keep the ink cartridges for the printer?
M-Cn:'),
    ('30b4d2de-25dc-4651-bb3c-7af941555618', 'M-Au: Ali is going to Jessica''s retirement party, isn''t he?
W-Br:'),
    ('7faa1453-4fd9-4c2b-a38a-143eb3bc887c', 'W-Am: Why don''t you go to the trade show with Franklin and Jane?
W-Br:'),
    ('1ca1fc9c-e206-499f-96d6-8e90522d26f0', 'M-Au: When are we ordering more gloves for the laboratory?
W-Am:'),
    ('7728051c-6a07-455c-a9ca-459114611d5e', 'W-Br: Doesn''t this movie theater seat 500 people?
M-Au:'),
    ('66d696a1-ec13-43ea-a0fc-02beb0235d99', 'W-Am: Would you like to make an appointment with the nutritionist?
W-Br:'),
    ('48153007-ba93-49df-bf48-7cec558cb2bf', 'M-Au: Did you know that the Vienna Orchestra''s giving a concert here soon?
M-Cn:'),
    ('3e853965-52c9-4e07-9b3f-6cbe8bb55422', 'W-Am: What''s the marketing department working on?
M-Au:'),
    ('c6a1e517-a00f-4019-9c31-d335b1865a6a', 'M-Cn: Isn''t it hot in here?
W-Br:'),
    ('33eb3565-74a8-4dd6-9416-49f74e58b497', 'M-Cn: Do you want to drive to the convention center, or would you like me to?
W-Am:'),
    ('f8e18b3c-4a98-4e72-bedf-5407e3f27f4d', 'M-Au: Could you pick up some more paper for the printer?
W-Br:'),
    ('cfe062d8-e53f-4272-ad62-bc7ac106a938', 'M-Cn: I''m about to order lunch now if you''re hungry.
W-Am:'),
    ('c1cc0f70-7390-4dd6-827c-a66830f571c4', 'M-Cn: Where''s the camera on this computer?
M-Au:'),
    ('451498fb-c890-497e-8566-80042e6940c1', 'W-Am: The conference is in Helsinki this year, isn''t it?
W-Br:'),
    ('de1f6cab-8ae9-492e-9f18-59564040fd87', 'W-Am: Should I schedule the inspection for Monday or Wednesday?
M-Cn:'),
    ('ee675b01-5f5d-4154-af75-f42fe82cadb1', 'W-Br: Let''s talk about how the business trip went.
M-Au:'),
    ('3b90b07f-1d60-4692-82d8-57cc16ae8eeb', 'When does your bus leave?'),
    ('695300e1-905c-4add-a9e2-e02418275254', 'Who made the cake for the party?'),
    ('95e5f109-9fcd-4f8d-9c1f-7be512e77993', 'Why are you taking French classes?'),
    ('a3c697c2-7623-4d7d-bcdc-00db4cb89c40', 'What material is this shirt made of?'),
    ('2f6b8775-0164-4f81-9c81-6531b5d94945', 'How much will the jazz concert cost?'),
    ('712dd49a-e110-4304-b909-9c9f6a393703', 'Where’s the robotics conference going to be held?'),
    ('51cdc424-853e-4937-9045-7a8aaa872ab8', 'Would you like me to turn on the air conditioner?'),
    ('236a6c08-b2ae-49f0-8d11-34ca1717ac2e', 'When do you need a copy of the contract?'),
    ('8ad282c7-89de-408f-810b-981b16d46829', 'I definitely think we should reschedule the picnic.'),
    ('cc82a291-4a78-48bd-aea8-1368835c6f54', 'How often is this filing cabinet organized?'),
    ('b72efb6b-0cff-405e-8c48-4fcc7fe28417', 'Is Ms. Lee planning to run for mayor in the election?'),
    ('b4f9f887-cb02-42dc-847f-85079be44b78', 'Are you looking for a one-bedroom or a two- bedroom apartment?'),
    ('6daa368c-ed50-45d0-bc9e-5a7105a3a0f7', 'You should include an image on each page of the book.'),
    ('45636bb2-f70b-4115-863b-993831d45a77', 'How do I make changes to this section of the Web site?'),
    ('7b994bbe-e184-446e-96a3-b8e429cf2aa9', 'Will you be working a half day or a full day?'),
    ('34fcecc2-970e-4189-ad7f-41bc35c3e561', 'There’s an opening in my department for an accountant.'),
    ('2000cf35-7b7d-4125-9014-bbcaee43162a', 'Isn’t the shuttle between terminals fully automated?'),
    ('fedf805e-9d9d-451e-9540-411ab59533d9', 'What’s the product code for that item?'),
    ('d5c0f399-968e-42f5-887e-6bcd2e1a5cd8', 'Why don’t we rent a bigger booth at this year''s conference?'),
    ('43f421f3-d928-48b5-99d0-ae825bb56c19', 'Carmen’s computer needs to be repaired, doesn''t it?'),
    ('cf30fb2e-1904-46fd-a06b-d9318a8e2196', 'Who are the candidates for new branch manager?'),
    ('c8d6ff9d-ab72-4ca5-ae71-f860795cbd06', 'Did the focus group like the advertisement we designed?'),
    ('51d6c122-39c6-402d-8d8c-20823b2ba7b1', 'Please let me know when you arrive in Osaka.'),
    ('2019554c-f87f-4216-83d6-6cf87ba9a1e2', 'Where exactly is the employee cafeteria located?'),
    ('54ef4a6b-3e84-4078-a434-faa875fce51b', 'You’re meeting with the clients on Thursday, aren’t you?');

INSERT INTO migration_part2_question_text_20260811 (question_id, question_text) VALUES
    ('fd5156b3-ef5d-4458-96ba-98128088312c', 'W-Br: Who is coming to the meeting?
M-Cn:'),
    ('e7220466-1f5d-4cb4-b152-7bac5ff51bbd', 'W-Br: I like having lots of plants in the office.
M-Cn:'),
    ('6fefc3d0-c6d0-444c-9525-aac938f32072', 'W-Br: When will the training manager arrive?
M-Au:'),
    ('17f16bbf-83d3-40f7-942c-886cc54b62af', 'M-Cn: Isn''t there a pharmacy on Fifteenth Street?
W-Br:'),
    ('e8f52d9a-9508-4ac6-aa26-96d01b14c726', 'M-Au: Where is this shipment of supplies going?
W-Br:'),
    ('4247c303-5876-4961-8e80-d047663b6b63', 'M-Au: The new Peruvian restaurant is great, isn''t it?
W-Am:'),
    ('d39e546d-48ad-4a4b-b04c-376c69f4996f', 'M-Au: How did your presentation for the client go?
W-Br:'),
    ('6ba6b76e-2553-4960-88de-02b8d2641156', 'M-Au: Please arrive ten minutes before your scheduled appointment.
W-Am:'),
    ('8059e0be-6339-4cd5-ae4b-47ed3cdf1781', 'M-Au: Do you want to talk after your conference call?
W-Br:'),
    ('744dc35c-4436-47c9-8a30-606a98b6adb2', 'M-Au: Why is Maria out of the office today?
M-Cn:'),
    ('094b0b80-ba48-4480-99c1-f170e98875a0', 'W-Am: There''s heavy traffic on the highway.
M-Cn:'),
    ('dde37434-6b9d-4a10-8206-8dad72217864', 'W-Br: Did John send the expense sheet by e-mail or regular mail?
M-Au:'),
    ('9558ae17-29e3-47f0-8bca-0e3b48478c45', 'W-Br: Why don''t we invite an author to speak at our bookstore?
M-Au:'),
    ('aa395027-2e8c-4b6c-93d1-f5de77684a75', 'W-Am: What documents should I bring on my first day of work?
M-Cn:'),
    ('427c3a1d-160d-4c65-99c9-adb5cf33f6de', 'M-Au: We completed the training course, right?
W-Br:'),
    ('62661b41-c4b8-4648-b32d-1a272d3f2f6a', 'M-Cn: How can I get to the mail room?
W-Am:'),
    ('3200fe6e-ab43-4894-b37b-e9ff1a9b18bb', 'W-Br: Didn''t you register for the webinar?
M-Au:'),
    ('dfdab572-caad-4994-87e7-97281b1cb926', 'W-Am: Is there a fee to use my credit card abroad?
M-Au:'),
    ('4904310d-d463-49ad-b13c-204b33bc87d3', 'M-Cn: Are you taking the train or riding the bus to work?
W-Br:'),
    ('ccf7bc30-84ee-4793-b77e-eec5fe8fde52', 'M-Cn: Would you like a tour of the new automobile factory this afternoon?
W-Am:'),
    ('e0b5c7e3-b7c2-4add-b719-f8cb206fc0d1', 'M-Cn: Who ordered the cake for Miguel''s retirement party?
W-Br:'),
    ('864156a7-87c7-484a-88ad-a8762b76bf96', 'M-Au: Where is Mr. Watanabe''s office?
W-Am:'),
    ('4c4965ff-59a2-459b-b64c-0a06231e304a', 'M-Cn: When will you start looking for a new apartment?
W-Br:'),
    ('72a6c9e8-1f12-489b-b9fc-55d5674930c0', 'W-Am: Let''s get extra screws in case we need more.
M-Au:'),
    ('8758cd08-0da7-4cd6-afc1-ae7b3836e134', 'W-Br: Which radio advertisement did the focus group like best?
M-Au:'),
    ('9dca24f0-c9b9-44f5-891b-1f180e11ee44', 'M-Cn Who’s going to take home the leftover cake?
M-Au'),
    ('1da13284-969d-4634-abe8-7ed47dc616c1', 'W-Br Can you tell me where the security office is?
M-Au'),
    ('d489314e-a0ab-402e-ad85-4cebdd9a4130', 'W-Am What’s the best way to contact you?
w-Br'),
    ('d7645a10-ffa1-4f0a-bfaf-ac49922f6fe4', 'W-Br Who’s joining us for the waterfront boat ride?
M-Cn'),
    ('fc845b6c-0f27-4789-9470-7140d521fea5', 'W-Am Could you request a technician to repair the packaging machine?
M-Au'),
    ('92e634a3-4c56-4474-86e8-c070110070cc', 'W-Br How many copies of the proposal should I make?
M-Gn'),
    ('fb499806-30de-4d84-8fed-89af065d3b70', 'M-Au Why is Jonathan leaving early?
w-Am'),
    ('90c2bf33-ec26-4a00-ad05-5280182f53f8', 'W-Br Where’s the company party being held?
M-Au'),
    ('85c4d684-dd56-4983-9acc-f4f00d4e3b4b', 'W-Am Did you want to sign up for a one-year magazine subscription?
M-Au'),
    ('52915500-f0ff-44da-8b91-abfea3b4fe23', 'W-Br Does this pasta come with a side salad?
M-Cn'),
    ('1a093e07-5929-42bf-bbc0-4c07a57b2966', 'M-Au When can we meet about the invoices?
M-Cn'),
    ('8dfff42c-6c06-4bbd-8a06-73ac298a3b4b', 'M-Au Would you like me to help you open a savings account?
W-Am'),
    ('145871c4-2411-4e9e-9311-0802b813b327', 'W-Am When did you post the job opening?
M-Au'),
    ('30d0f55c-72a7-4234-8eba-d89f99ef553b', 'W-Am Are you applying for the manager position?
M-Cn'),
    ('f83e66c9-eed8-46bc-981e-cb0627eb9365', 'M-Au Are you traveling in business class or economy?
M-Cn'),
    ('7e42c736-9797-41ab-9d21-81d2949ed8c6', 'W-Am The number of subscribers for our magazine has decreased recently.
M-Au'),
    ('cb99ab6c-67d2-4054-9fea-25162b89bc9b', 'W-Am How do you clean the solar panels without damaging them?
M-Cn'),
    ('38f1f1d0-1af7-4436-9c50-28ffbb733ed2', 'W-Br When will I receive my certificate in the mail?
M-Cn'),
    ('b21beb48-95e6-40e2-8c81-97169810b278', 'M-Cn Don’t we sell Ramirez lawn mowers?
W-Br'),
    ('4784bb56-0e79-4c59-8035-8102ebb55d6b', 'W-Am Should we meet to discuss our research project?
M-Cn'),
    ('ba2c4fd9-7763-47a4-9f44-f3b8de963f07', 'W-Br When does the cleaning staff leave for the day?
W-Am'),
    ('ef31f7ec-74d5-40f3-a50c-6968d7b529e8', 'W-Br How would you like to pay for these shoes today?
M-Cn'),
    ('96c92562-b92c-42bc-b13f-7dd72aa62f2a', 'M-Au It’s an effective advertisement, isn’t it?
W-Am'),
    ('6c141b88-b44e-4179-9191-dd6bf76e8188', 'W-Br Why don’t we take a walk after lunch?
M-Au'),
    ('954e37b2-7e45-4ee8-af60-774b5932bd92', 'W-Am I decided to move the seasonal merchandise to the front of the store.
w-Br'),
    ('2571eeff-c9aa-4119-82fd-1a1506b1838b', 'Will you order the pasta or the chicken?'),
    ('cbbf38de-6bcd-423b-baa4-428cf802799d', 'Who should I talk to about getting a ticket to Bangkok?'),
    ('ac1a5204-0915-4673-8d0a-c605a5815e31', 'Would you like the report to be e-mailed or printed out?'),
    ('44fa2e38-1a60-4882-badf-1ce29c9ae674', 'Have you decided how much to charge for your concert tickets?'),
    ('c0d542dd-08d5-49b4-b677-ec412c0ff19a', 'How often does the store offer a sales promotion?'),
    ('bbecaf99-3b0d-486a-a29a-7d2689e9a69c', 'The tour starts at noon today, doesn''t it?'),
    ('7ba9e4b7-74d3-4ce8-bb4c-f03ed9dee3f8', 'Let''s begin our meeting about the Taylor project.'),
    ('1fa14a6d-c4a7-4125-a02a-cd8fe8152f3c', 'There''s a dental clinic on Main Street, isn''t there?'),
    ('39e88daa-fdb4-4f03-b493-e25d6ef5201f', 'Where is the book reading going to take place?'),
    ('df6b7665-ee6f-4497-b8c4-58cd61be563e', 'When''s the bus going to be here?'),
    ('36b600be-5c55-4d77-81f6-255db7d7e33f', 'The estimated price for this car insurance is higher than we expected.'),
    ('3cab3d51-dbd7-4021-9128-c44a41e4c1a4', 'Why haven''t the renovations been completed yet?'),
    ('234d682b-0130-4334-914c-9285caa1e6e9', 'I''ll give you my office number in case you have questions about the data.'),
    ('be2c24b3-00c5-4b0b-93ba-f5e7f52f83fe', 'Which parking area should we use?'),
    ('f4c3e456-c03d-41ae-b657-cfd484880ccd', 'Let''s take a taxi to the airport.'),
    ('51a60708-2c3f-4da8-87b4-b5e33617b195', 'Our team training session was well attended, wasn''t it?'),
    ('1947fbc0-5f79-4e02-ab82-5e4f45931328', 'Why''s the company discontinuing its newsletter?'),
    ('6e74a18d-36fe-40cf-848e-446b6a5e991f', 'Weren''t you planning to take the afternoon off?'),
    ('ac1a7583-b314-43d3-98fd-041558185db0', 'Dr. Molina sees patients in her Middleville office.'),
    ('0c4abcee-7c95-422b-bd21-914523cce105', 'Who''s going out for lunch?'),
    ('e400fff6-08cd-461f-84b0-fa708c1006ad', 'Do the tickets go on sale this week or next?'),
    ('7aa69224-a79c-449b-bcab-45bd3aca3f11', 'When will you finish updating the sales data?'),
    ('e0c0422f-e532-490f-ae01-65aecc930e33', 'Who''s leading the planning session tomorrow?'),
    ('4b5e3d7e-9836-458b-a69d-bf68d1570128', 'Aren''t we meeting with the clients this evening?'),
    ('a24b4b83-f67e-442a-906d-0163525122a0', 'They invited me to the opening, didn''t they?'),
    ('b8c987d1-2f9e-4e10-9afe-c9fb24f3ea97', 'M-Au Why is there no flour on the shelf?
W-Br'),
    ('18994c89-a24b-483c-8001-69031c88d9e1', 'M-Au When will the catering company arrive?
w-Am'),
    ('ceee2e75-287c-451f-843d-d463c51b1c87', 'W-Am When''s the meeting scheduled to start?
M-Cn'),
    ('574a12da-380e-4c47-92fd-1fd882dda030', 'W-Am How much will the repairs cost?
M-Cn'),
    ('5f5514c1-abbf-4d5f-b7cb-3b07b28c1625', 'M-Au You went to the dentist this morning, didn''t you?
w-Br'),
    ('ebcb05ea-5c78-4399-b4f9-b8ded8ef74da', 'W-Am Where should we put the new printer?
M-Cn'),
    ('8ea3c1f3-6a27-4124-b550-b1c2d6198b03', 'M-Cn What type of plant do you have in your office?
W-Am'),
    ('83548cbd-5fdc-41b0-9910-3f977dc1ddbe', 'M-Au There was a sale at the furniture store.
w-Am'),
    ('b986c916-abf6-473f-8ead-08b66b501479', 'M-Au Can you show me how to submit a tech help ticket?
W-Br'),
    ('9c0aa696-de7c-4718-9bac-ec2eefb55ed5', 'M-Cn Where is the power button on this device?
M-Au'),
    ('eefed5de-042e-412a-9903-3c4933e5fdb0', 'W-Am Do you want to take a walk now, or would later be better?
W-Br'),
    ('0c2a8eff-0a0a-4b80-aa49-bed1e9019e59', 'M-Cn I ordered some new equipment for the factory.
w-Am'),
    ('8a4243a2-9ae0-4127-96b5-2ac6c535b513', 'M-Cn There''s a nice place to rent on Mercer Street.
w-Am'),
    ('7d75f838-161e-4899-913e-b74f623f1c12', 'W-Br Is the heating system working?
M-Cn'),
    ('1b7d8573-8d61-43a6-bd98-3c1991f7ad31', 'M-Au Isn''t the roadwork in front of city hall finished yet?
M-Cn'),
    ('df9002c9-b61d-401c-a585-b478091aa162', 'W-Br: Who will lead the new employee training today?
M-Au:'),
    ('669bfffa-6ecc-437e-ac8a-658ba805e2e8', 'M-Au Is the safety inspection scheduled for this month or next month?
W-Br'),
    ('333fe0a0-8201-4ae6-bff3-277c7a4e5034', 'W-Br When is the harvest festival taking place?
M-Au'),
    ('59dd2cc5-4709-41ee-ab8b-88d66db7cfa5', 'M-Cn Was your new laptop expensive?
M-Au'),
    ('70d0715a-6f5d-4a7f-826b-bd0c042421ed', 'W-Br Why don''t we go on our camping trip next weekend?
W-Am'),
    ('ba902a86-dc51-44b6-8f48-e03fd07b0eaa', 'M-Cn The workshop for this afternoon was postponed, wasn''t it?
M-Au'),
    ('49c55d84-e196-4142-a11e-e0c4c80649bf', 'W-Am How were our production figures last month?
M-Au'),
    ('78baffec-0f6a-4e7b-9414-51c08bdaeb3d', 'W-Br When can I see the speech therapist?
M-Cn'),
    ('1407f868-bdef-433c-b20e-07beff871772', 'W-Am Aren''t you picking up the clients from the airport?
M-Cn'),
    ('d9a81421-f73a-4457-9718-0d5bea94e1bb', 'W-Am How was your morning client meeting?
M-Au'),
    ('d2ec03a4-12ea-42e6-ac01-e415357eb816', 'Have you made an appointment with your dentist yet?'),
    ('66bbb7f1-7dc7-4b46-af8d-25ac5f8fbaba', 'Do you want to buy the blue sofa or the yellow one?'),
    ('ec95cd0a-caae-4b63-b1f7-c2938506b2cf', 'When is your restaurant going to open for business?'),
    ('4917e720-6172-4ed0-adc5-7c8674afdf83', 'Why won’t my computer turn on?'),
    ('dee96466-b5f7-4f58-93e1-a1d71c1b53f9', 'Do you like the renovations we did to the office?'),
    ('3b1b2729-a37e-4e30-8fef-d4aba5a76fc1', 'Which conference room is the accountant using?'),
    ('9c0f92d7-71bf-4818-8828-4a448363da05', 'The Internet isn’t working.'),
    ('aca9dfc7-40d1-4e66-9680-4227a1fa75ed', 'Would you like to present first, or should I?'),
    ('8f1600bb-8d64-4ff2-995e-e006b3a5618c', 'The concert tickets are on sale now, aren’t they?'),
    ('2e2cdd77-97a7-4cac-b455-ed1e12c4b872', 'Do you have any feedback about Yumiko’s performance?'),
    ('902455e2-93f8-4137-a72a-9cddf6000548', 'Why don’t we reassign Silvia to the evening shift in the stockroom?'),
    ('7373f062-b6d8-4e05-9816-3c383f951641', 'How can we find extra seasonal help?'),
    ('a707bf82-730d-44a3-a28f-fcbe535a3d87', 'Do you know if there’s a bus from here to New York City?'),
    ('4afa6d8e-863c-47cd-a4f5-63ef19c1e51c', 'Who’s driving you to the airport?'),
    ('9db740fd-bd68-4f4a-b1d0-d35d9abf5440', 'How often should I replace the water filter?'),
    ('4055d6f0-ce77-42bf-b145-de9bc4daa541', 'Aren’t you still on the event-planning committee?'),
    ('a4ce1af2-c4bf-4882-a3a6-81284e500002', 'Would you like to join us for tea now in the cafeteria?'),
    ('3d29af99-31d6-42d3-99a1-0f7ea231eae2', 'How do you think the new robotics technician is doing?'),
    ('b11401be-b937-4ee3-8501-8eb39b0c1553', 'I hope the building inspector will arrive soon.'),
    ('3c82a87a-8854-4525-bc59-175a41b9b1fe', 'We should order a cake for the company picnic.'),
    ('2c6997cc-d16b-4ed3-b490-ff50cbd0ead2', 'Does the rental vehicle have automatic or manual transmission?'),
    ('4350a868-d806-4419-8b34-19c6c3be63b7', 'I’d like to have some jackets altered.'),
    ('52eb52ed-e981-4d1c-a099-d77ba3de9895', 'Where should we unload the kitchen tiles?'),
    ('8d9c1e39-4eed-4ccd-a7c3-d5aa689daaf8', 'Are you using the older version of the software or the one that was just released?'),
    ('29879edd-c3e2-4cd9-9f8b-a6e4d4c1e5c7', 'Could you help me access my e-mail account before you leave?'),
    ('19ae8533-6d45-442a-9fc5-2c71ed4ee921', 'M-Cn: When will these shoes be back in stock?
W-Br:'),
    ('7ecfe497-d1b4-40d1-b0e0-80dc699e8d62', 'M-Cn: Is this a full-time or a part-time position?
M-Au:'),
    ('0dcd8b84-ba6e-4b2c-9160-635da1f09574', 'M-Au: How do you usually get to the office?
W-Br:'),
    ('c743350c-f359-4ea0-82c1-900ef3a05d9f', 'W-Br: Why is the company planning to hire a new receptionist?
W-Am:'),
    ('63093064-76cd-4f86-84b1-6243ded195ca', 'M-Au: Excuse me, may I check your train ticket, please?
M-Cn:'),
    ('94756c3a-9644-4b82-ba05-0d05362fa921', 'W-Am: Which folder should I place this document in?
M-Au:'),
    ('7ad6269e-0a08-4070-9241-09a920179025', 'M-Au: Where can I pick up my name tag for the conference?
W-Am:'),
    ('9c5ff2c5-5a5f-471f-ae0a-d0bca70db3ef', 'W-Am: Why did you decide to become a history teacher?
M-Cn:'),
    ('5c0204fc-9ec0-4725-bc23-ea9aa3d9bd7b', 'W-Br: Doesn''t the restaurant menu need to be updated for summer?
M-Au:'),
    ('953c48b6-ad91-485a-a970-1b669d40b81a', 'M-Au: When are you going to paint your office?
M-Cn:'),
    ('1c6bae1e-8964-48a8-985b-f505679de9bd', 'M-Cn: Isn''t our presentation next week?
W-Br:'),
    ('73b6a417-1963-4cee-a492-17a1dba85da6', 'W-Am: You''re working on programming the Web site, right?
W-Br:'),
    ('9bc1cf70-9c92-495e-93eb-d9f78ba5e3d7', 'W-Br: I think you should call off the meeting.
M-Au:'),
    ('f5554332-8817-425d-b143-5e38649336b5', 'M-Au: Who can teach me how to operate this new cash register?
M-Cn:'),
    ('405f0350-0070-4243-bf77-66712c05f06f', 'W-Am: Where''s the broken fax machine?
W-Br:'),
    ('9df93ecb-57ee-455e-8e66-f2d0a043aa06', 'W-Am: How do I record my overtime hours?
M-Cn:'),
    ('c791baed-7ed8-4fc9-8ea9-2544fd02165f', 'W-Br: Should we invite more guests to the banquet?
M-Cn:'),
    ('fd69da69-c132-40a8-9221-60cd827144e9', 'W-Am: I''d like to cancel my subscription to Lakeline Times.
M-Au:'),
    ('62a47cf9-b2e4-49b9-a250-09cef1f9c934', 'W-Am: Who left these boxes in the hallway?
M-Au:'),
    ('d321a3b4-fb77-44ef-829e-0424e2561dc2', 'M-Cn: I''m taking our new client to lunch.
W-Am:'),
    ('a446174c-73cb-4484-b630-25a88b15efad', 'W-Br: Would you prefer to open a new store downtown or in the countryside?
M-Au:'),
    ('f1bfcf73-44b0-49af-9121-dffb207fb10d', 'W-Am: Tim is organizing the office tour for the interns, right?
W-Br:'),
    ('abc7e6e8-80d7-4f2b-9ea9-707d0497dfdd', 'M-Cn: I''d like to book accommodations for a family of five.
W-Am:'),
    ('3dafc00b-1b74-42fc-b110-a9c2dfb50e38', 'W-Br: Why don''t we finish the budget report tomorrow?
M-Cn:'),
    ('4848ac2a-6651-42c7-abce-913a877af1b7', 'W-Am: Is the television ad airing this morning?
W-Br:'),
    ('d99f6f83-5a61-48cb-bb68-440275fc2552', 'M-Cn: What color should we paint the waiting room?
W-Am:'),
    ('29fdbbad-60d4-41c4-8556-45f6470ca4cd', 'W-Br: Who has the attendance sheet?
M-Cn:'),
    ('a1d6bdd1-936d-4daa-ae62-66d488f8e711', 'M-Cn: The last train to Melbourne hasn''t departed yet, has it?
W-Am:'),
    ('5ac3358b-7aad-4421-99e8-bdade324650b', 'M-Au: How do I get the drawer of the cash register to open?
W-Am:'),
    ('dcac2b68-9348-41dd-b9ef-93b3848279de', 'W-Br: Haven''t you put in a lot of overtime lately?
M-Cn:'),
    ('86fc08f7-dd29-4381-9d99-2c22d4c57885', 'W-Am: Where did you work before this?
M-Au:'),
    ('59c0e6d6-e602-4740-8409-5cffec57eeee', 'M-Cn: Could you help me interview some job candidates?
W-Br:'),
    ('9179e4bb-77a3-4cf5-973b-78ed894e701f', 'M-Au: When is Mariko''s trip to Moscow?
W-Am:'),
    ('90071149-5606-4ad6-ab17-fde546b9ebdf', 'M-Cn: Please deliver these account files to Mr. Zhang.
W-Br:'),
    ('6f225387-2ec5-4ba5-9a25-b689b016b3c8', 'M-Au: Why is the parking garage closed?
W-Am:'),
    ('079eb6bb-f5d0-4f5b-9434-b8daf427da03', 'W-Br: Do you want your commercial to run at seven or eight P.M.?
M-Cn:'),
    ('663acdcd-286c-4e72-8c55-cbb0c915b24f', 'W-Am: Isn''t the director of public relations coming today?
M-Cn:'),
    ('7f47f555-0d2b-48dd-834e-cd53a578a113', 'M-Au: I can lend you a pen if you need one.
W-Br:'),
    ('04c927e3-6743-4f7f-aa68-6adff5732fbe', 'W-Am: Which photograph did you want me to edit for the magazine?
M-Cn:'),
    ('f6e14789-d826-4ccf-9001-48f06be745ea', 'W-Br: Why did your company decide to advertise internationally?
M-Au:'),
    ('22f38fb5-ecfa-4e26-81c7-4a5c1e753f2e', 'W-Am: The book you want to read is available at the library.
M-Au:'),
    ('9ffcddd9-a926-43ea-af0c-a9321d8c2152', 'M-Cn: Are you going to print a few more copies of the agenda?
W-Br:'),
    ('58e853e3-3de7-4a0a-bf97-0b1c4b987f7e', 'W-Br: How did the product demonstration go?
M-Au:'),
    ('21d80416-362a-47b8-b258-d6e8ac0d6bb8', 'W-Am: The actors in this play are talented, aren''t they?
M-Au:'),
    ('8ea090c4-ca83-4a87-a230-0967053a1bb6', 'M-Cn: Where are we meeting with the clients this afternoon?
W-Br:'),
    ('ff542406-5576-4fea-80b9-1e70539b605e', 'M-Au: Did all the new mobile phones pass the quality test?
W-Br:'),
    ('d4bdb236-b58d-4612-8a22-c86e354fad62', 'W-Am: Who''s organizing the office holiday party this year?
M-Cn:'),
    ('9e1bf710-8900-4023-82f8-fd4c327454ef', 'W-Br: Have you considered taking a professional development workshop?
M-Au:'),
    ('5b4b1a7b-573a-4424-bd15-8d9e41ab6c1c', 'M-Au: Construction on our downtown office building is almost finished.
W-Am:'),
    ('9f4f05e4-a008-43cc-bbc4-142726ee95bc', 'W-Br: Didn''t you use to sell these vitamins at your store?
M-Cn:'),
    ('a3b76311-fd8b-4b25-89de-41767efc5bca', 'M-Au Who’s covering for Ms. Hamada?
W-Am'),
    ('53e7ddc7-9561-4d98-a4c5-0799dd6d4a4e', 'M-Cn Where is the fashion seminar?
W-Br'),
    ('c1582f59-81ab-4b26-9a92-0c4f8379ba20', 'M-Au Why do we have to put on safety goggles?
W-Am'),
    ('ccc9a9ec-4806-4a8e-8118-6fe6831a4dd4', 'W-Br What did you do for Mr. Sugiyama’s retirement party?
M-Au'),
    ('546da8b1-7fdd-493e-821b-421f43e0071c', 'M-Au Can I take another bottle of water?
w-Am'),
    ('ea6a2798-97b5-4e8f-8ec7-f3808b2c8222', 'M-Au Isn’t this the last train out?
w-Br'),
    ('aedb1c74-7cbe-415f-bebb-846a4ac5def7', 'W-Br What was the highlight of your visit to the city this weekend?
M-Cn'),
    ('1fcd32cd-2640-4f3a-af67-6e89ca76a011', 'W-Am When was that news story about the merger published?
M-Cn'),
    ('9c009207-9c4e-420b-914e-f8b55ed0e1a3', 'W-Br We need to install a security system at the office.
M-Cn'),
    ('62e8494f-fcdf-4d57-becb-a428351fb5ff', 'W-Am Where are the job fairs being held?
M-Cn'),
    ('27818ef7-89d8-4a4b-8148-edcfefa7ff06', 'M-Cn When can we use the new color printer?
W-Br'),
    ('f21972af-0d34-4948-8a26-0166ed241ded', 'M-Au Could you order some more paper plates?
w-Am'),
    ('d56b2d81-e344-498b-84ea-58367d39d6c0', 'M-Cn Should I pick up the food order for Ms. Santos?
W-Br'),
    ('56f3c1f8-954b-4766-b2d5-3750f530845e', 'W-Am Why don’t you distribute this flyer around the office?
M-Cn'),
    ('21b58fd5-f415-4700-a972-704f2173f86d', 'How often do you go to concerts?'),
    ('aeb363ec-88f3-4da9-8d7c-e9b6dd621703', 'W-Am Do you want me to fix the printer in your office?
M-Cn'),
    ('42f38713-70cf-4c63-87db-e2938ef5afe6', 'M-Au Will the company’s warehouse be built in the city or farther out?
W-Am'),
    ('7b61e881-e8de-447c-81b7-55526f41f216', 'M-Cn The taxi has finally arrived.
W-Am'),
    ('0c53f4d1-ee97-44b0-ad27-f32eace6cbc6', 'M-Au How can we train all the new team members?
W-Br'),
    ('f593ee1d-4193-44e5-a00d-aa54b20550ad', 'M-Au The party is supposed to start at six p.m., right?
W-Am'),
    ('b86041b0-3a7f-4e18-9a49-0aba6cc920cc', 'M-Cn Does the manager want us to pick up the supplies or have them delivered?
W-Br'),
    ('169eb4b2-deec-4a69-b999-d2ddd4b58caa', 'W-Am Has Jacob come into the office today?
M-Au'),
    ('7be2b34c-f18f-4b1e-a749-2c47629ffef6', 'W-Am Are you joining the team for today’s briefing?
M-Cn'),
    ('659701a5-eb5e-4919-bb70-e424ea4f2005', 'W-Br: I’m organizing a healthy eating program at the office.
M-Au:'),
    ('02af4000-ad96-4962-b250-8be5f2c40128', 'W-Am: ls your car expensive to repair?
M-Cn:'),
    ('7b586f5f-081c-4fc7-8bbf-675fc86246c4', 'What type of food does that store sell?'),
    ('918532ad-7404-48e6-ba11-378b9bf4cbe0', 'When should we leave for the airport?'),
    ('ce3b3c48-d115-470d-88e9-cc2151e908c5', 'Where’s the hiring event being held?'),
    ('c572d33a-3f6a-4dd6-b32f-5faac70128d4', 'Why is the budget being updated?'),
    ('9074d3a7-3218-4661-8a3e-280bb53f4b47', 'Can you cover my shift at work tomorrow?'),
    ('ef1c8049-2b15-4904-8502-04cfd5012858', 'Who ordered these vegetables?'),
    ('626f9506-1849-4351-af73-0b31625efeb3', 'How often should I mail the notices?'),
    ('9d80e19c-4cdf-404b-b64a-82e2d423a7b8', 'Which folder are the documents in?'),
    ('1e3935b4-ef00-464d-ac00-11b88a5d8f48', 'Did you end up going to a movie or to the concert last night?'),
    ('130dca1b-dc2f-4756-8de9-428b28df0224', 'We’ll take the company bus to the conference center.'),
    ('4f27a945-53ca-454a-bef9-c5decf91bd68', 'What should we put in the introduction to the report?'),
    ('d1fb7fb1-04eb-40c4-95dc-1c0b906c1cf9', 'We should have a new logo designed.'),
    ('277bb372-22ae-4cd9-ad35-f0cd461f8087', 'Did you select a site for the new headquarters?'),
    ('96c9fc70-8440-4254-9f82-164ecb474f06', 'Who’s going to cancel the meeting?'),
    ('dbaff714-bd95-42b4-902b-c8f0deb56feb', 'How was your business trip?'),
    ('2f89bcf5-39d7-4671-b991-fefe499f77cb', 'Why did Chae-Won hire an assistant?'),
    ('d6e61c53-0760-4d91-88d4-c2537bca4944', 'Would you mind showing me the new office space?'),
    ('26a1878a-8bf2-47ca-a825-f376634a71be', 'We''re trying to decide where to order from for lunch.'),
    ('79b3d54a-3390-4b6c-bc95-bb027aeab95c', 'When do you plan to finish the advertising campaign?'),
    ('008dd6bb-4af6-4e25-a28d-7aa52a5d84b2', 'Where will the guest speaker be joining us from?'),
    ('fc54c0fd-0fa7-4614-a2e3-74acd38d7ed6', 'Wouldn’t you prefer that Mi-Sun lead the training?'),
    ('9040264e-137f-4271-a2af-3aab4c42fb5d', 'We should get some feedback on this book cover design.'),
    ('8689bbad-9aac-41e0-b8a2-593a0ac82c54', 'Would you be able to delay the meeting?'),
    ('d7082eb2-c81e-4067-9354-2f17772ba6eb', 'Will you rent a car or take the train while you’re visiting?'),
    ('beb1aca1-7e74-478b-900f-38aa129d8254', 'Seven thirty at night is rather late for a meeting, isn’t it?'),
    ('7700e685-8572-4663-948b-794e3d9696da', 'M-Cn: You get your dry cleaning delivered, don''t you?
W-Au:'),
    ('59216b4c-6882-4bb1-a4e8-ae2d64244de2', 'W-Br: Did you get your business cards from the printing department yet?
M-Au:'),
    ('86c74cdb-5c78-4afb-a8d5-71891e8eb33b', 'M-Au: Why was the ferry service canceled today?
W-Cn:'),
    ('8cb0940b-39d4-4f42-8ae3-519b2f8ff993', 'W-Am: How often can we request office supplies for the team?
M-Cn:'),
    ('ba09064d-37fb-44d2-b871-1acca8e2fcda', 'M-Cn: When are you giving your speech at the conference?
W-Br:'),
    ('58df8144-f0ba-442e-be2f-cded4d9ca83b', 'W-Au: Have you emptied the boxes that arrived from the vendor?
M-Au:'),
    ('814fd153-de89-478a-992c-23e477205b72', 'M-Au: Would you like to try the online photo-editing software?
W-Cn:'),
    ('6916adad-ffbb-4f75-8190-48c9ee6fb61e', 'W-Br: Don''t we need a navigation system for the rental car?
M-Cn:'),
    ('3b7356bc-a92f-4f9f-b115-fa59e44051de', 'M-Au: Could you check the door to see if the side entrance has been secured?
W-Am:'),
    ('a614cf4b-dea2-4d18-8773-d7fffae00c6a', 'W-Br: I can return the items for a full refund, right?
M-Au:'),
    ('7340ca58-2e7a-4a9d-bdcf-246c3ee8cf05', 'M-Cn: What''s the fee for the hotel''s breakfast buffet?
W-Br:'),
    ('e62b3a1b-0869-4d0a-901a-f9d4c4a5b361', 'W-Am: Is the office''s new air conditioning system quiet?
M-Au:'),
    ('d6d11742-d2f6-4189-9ef5-022cb30c062d', 'M-Cn: Where can I get some colored paper for printing?
W-Cn:'),
    ('d87d0e0d-aedd-4270-bc0c-5bedc4052967', 'W-Au: Would you like some black tea or coffee after your meal?
M-Au:'),
    ('93c66514-a56c-4283-8c54-c2f82a5ec43d', 'M-Au: How do I renew my newspaper subscription?
W-Br:'),
    ('047397ce-d348-4bd6-bdea-d21da7b75df5', 'W-Am: Your department will undergo a financial audit next month.
M-Cn:'),
    ('e31f37bb-841e-4188-86d2-8bdac377843a', 'M-Cn: Would you like to help select the recipients of the employee awards?
W-Au:'),
    ('b1576cb0-61b9-416a-85f6-d9490f834503', 'W-Br: How about renting a private venue for the welcome reception?
M-Au:'),
    ('6074f1b0-f278-42fb-86dc-825dada0f8f5', 'M-Au: Who''s setting up the conference room on Monday?
W-Am:'),
    ('75729957-f8d2-4488-98e5-07f4befc9743', 'W-Au: Isn''t the portfolio supposed to be provided in digital form?
M-Cn:'),
    ('55686a5d-0cf1-4d4f-a6a4-0598f07f2897', 'M-Cn: Don''t you sell these hiking boots in brown?
W-Br:'),
    ('8f05b1dd-fc8d-4da9-a0ec-549666631150', 'W-Am: Should we get a one-year subscription for the software or pay monthly?
M-Au:'),
    ('04d4e36f-9b40-4202-bc3d-5b7c27b135ad', 'M-Au: Elle designed the invitations for the networking luncheon, didn''t she?
W-Cn:'),
    ('c97b9673-c2d0-4220-b38f-3116a2e4ba0a', 'W-Br: These containers should have been cleared from the loading dock.
M-Au:'),
    ('cd2d8226-d7b4-41ae-a9ed-cf7a1fa58b24', 'M-Cn: Who will be in charge of testing the health-monitoring equipment?
W-Am:');

INSERT INTO migration_part2_question_text_20260811 (question_id, question_text) VALUES
    ('3d01cab8-b339-41cb-9786-0a4b601c4f98', 'M-Cn: Who''s presenting at the sales meeting tomorrow?
W-Br:'),
    ('859c04c3-29f5-40ad-a678-3b215e7eabfb', 'W-Am: You haven''t heard from the insurance agent, have you?
M-Cn:'),
    ('680328eb-0a55-4a67-8e0d-f57bd8d2c649', 'W-Am: Will you be at the holiday party next week?
M-Au:'),
    ('c220fe7a-74d3-42cb-bb1d-a2c53c641e70', 'W-Br: Should we split the team into small groups for this training?
M-Cn:'),
    ('b7f4c836-862f-4dd9-b105-858693ea8e54', 'W-Am: There isn''t a bus stop near here, is there?
M-Au:'),
    ('fe0d6d84-5a69-43eb-a6e0-ce0982538d00', 'W-Am: Do you need some more application forms?
M-Cn:'),
    ('9ffafb20-05c3-41c0-b448-b1ad10ee67e4', 'M-Au: What''s the best way to get to the shopping center?
W-Am:'),
    ('c6ba9c87-034d-4a65-aec7-773d096944a0', 'W-Am: Isn''t the client from Fairbane Pharmaceuticals here yet?
W-Br:'),
    ('a9398485-b364-420b-9fc2-5e5b474c3a97', 'M-Cn: Where should we keep the extra boxes?
W-Am:'),
    ('5ddf82ff-242a-4238-abe7-ba4c09799a5c', 'W-Br: Would you like to come to the trade show this weekend?
W-Am:'),
    ('b291a750-8f65-42d0-9b1b-9c93934cd5ea', 'M-Au: What''s the cost estimate for the renovation work?
M-Cn:'),
    ('0d086e34-afcd-43fa-9bc6-c93b6710e8a3', 'M-Au: Would you like to hire one intern or two for the summer?
W-Br:'),
    ('c665ef86-a684-44ee-898f-fa7ef8266802', 'W-Br: Isn''t Indira going to drive our client to the airport?
M-Cn:'),
    ('e243c600-779b-4ca0-a484-ed55360cae13', 'M-Au: Did you buy tickets to the lecture at the library?
W-Am:'),
    ('d1f4a643-dc39-43c9-9fa6-2f588f296e1b', 'M-Au: Could you ask a technician to repair the door?
W-Br:'),
    ('4c0a0a5a-c664-43fd-8fe6-967adff04f22', 'M-Cn: I''m sorry you''ve been waiting so long for me.
W-Am:'),
    ('74915867-57ee-4e43-ac8d-a3ab5e30cf15', 'M-Cn: When will the expense report be finalized?
W-Br:'),
    ('f3484ba3-9065-42b8-937b-57604a2e7b92', 'W-Br: Why didn''t we advertise on the local TV network?
M-Au:'),
    ('e82f4a15-0f60-44f7-979e-d229925036fa', 'W-Am: The doctor sees patients until six P.M., right?
M-Cn:'),
    ('06b1fcb5-c927-4a31-8ae8-20d6e941df54', 'W-Br: How will the city pay for the new nature park?
M-Au:'),
    ('528a83d0-0213-47dc-9d74-6a1fa6436140', 'W-Am: Can you check to see when the train is coming?
M-Au:'),
    ('a3dd571a-bfa7-478c-8b54-0ed89eb89e09', 'M-Cn: Where can I find the department mailboxes?
M-Au:'),
    ('6511b531-88aa-49f6-9061-0eaabc604d06', 'W-Br: The office is cold today, isn''t it?
M-Cn:'),
    ('1a9452d5-1413-4d76-a110-c4222858640b', 'W-Am: I''m interviewing someone in this room in a few minutes.
M-Cn:'),
    ('3ec8b44a-37cd-4183-acca-034ae50ac58d', 'M-Au: How do I replace the belt on this machine?
M-Cn:'),
    ('cb8f6b2f-4ab5-4e03-b979-4f2a35e1a1b7', 'W-Br: Who is covering Maria''s shift at the clinic on Saturday?
M-Au:'),
    ('d0346b87-bd53-4a4e-9cf3-6671bf95e610', 'M-Cn: Would you like to meet the new clients?
W-Am:'),
    ('c269e9ea-688a-40be-832f-76d43b1316b7', 'M-Cn: Here''s my presentation proposal.
M-Au:'),
    ('d0d1b0c2-2ed3-466f-9d91-6960282033f6', 'W-Am: Do the city buses stop in the front or the back of the city hall building?
W-Br:'),
    ('57e7aaff-c033-4de8-889e-2ab7d5aa9112', 'M-Cn: Why is the ceremony being moved indoors?
W-Am:'),
    ('adb483da-a5c1-49b9-85c7-723a91a8bf0a', 'W-Br: I just love the taste of coffee, don''t you?
M-Cn:'),
    ('bf49f3b2-58b7-42a7-8a25-571a7fd6f91d', 'W-Am: Are you interested in a freelance translation job?
M-Au:'),
    ('0ad06ba6-327d-4061-aacc-a74a8eb802f4', 'M-Au: Could you send me this month''s maintenance schedule?
W-Br:'),
    ('1bc008e0-5091-4862-8dce-50d9767d3f9b', 'W-Am: Doesn''t our firm reimburse travel expenses?
M-Cn:'),
    ('b0437b7a-6433-41f0-8f93-93ff308acb1e', 'M-Au: I need to stop at the pharmacy on my way to work.
W-Am:'),
    ('8807d4e2-53b2-4004-9bea-71ca6924ba0a', 'M-Cn: Why are we meeting to discuss the budget?
W-Br:'),
    ('582b2cf8-1554-4f91-9222-6f70c0aecf3a', 'W-Am: When does your flight land in Los Angeles?
M-Au:'),
    ('a69d054f-2a3e-4bee-bc2c-a655882c11de', 'M-Au: How do I sign up for the accounting webinar?
W-Br:'),
    ('edb5731b-100b-4215-a97a-1c21da58ac68', 'M-Cn: What kind of food should I bring to the company picnic?
W-Am:'),
    ('8df6cd54-075c-4fae-8ff1-05ac5397e8ee', 'W-Am: Where did you put my copy of our project proposal?
W-Br:'),
    ('92cc0ff5-4a9f-4474-9a3a-9f6afa7157a2', 'W-Br: How many more deliveries are we expecting today?
M-Au:'),
    ('49aef04b-9a4c-4e68-9f4b-da9891521145', 'W-Br: When are we handing out the employee survey?
M-Cn:'),
    ('eb69e81c-97ce-420d-8de5-e0d2f92c8765', 'M-Au: Would you like me to send you samples of the fabrics we have available?
W-Br:'),
    ('af6c5057-1c73-4cb6-b9fe-c44d66ecb0de', 'M-Au: Her contract ends next month, doesn''t it?
W-Am:'),
    ('f9b2bc8a-3e5d-4b0c-9603-811aa6bfbdac', 'W-Br: Should we open the store at eight thirty or nine on Saturday?
M-Au:'),
    ('630e8bee-3c07-4f0b-90f9-07b4c0f78438', 'M-Cn: What kinds of audiobooks do you listen to?
W-Br:'),
    ('09630ded-aff6-4609-a4ef-fde56ce01437', 'M-Au: How long will it take to receive a confirmation e-mail?
W-Br:'),
    ('0dd14309-0c00-4da9-a93d-cd75c5e266e5', 'W-Br: Where should I have the workers stack the cases when they arrive?
M-Cn:'),
    ('27aa9d90-e815-48ba-b575-6c4ca7411a27', 'W-Am: Would offering more specialty breads attract more customers?
M-Cn:'),
    ('a97280d0-4917-45fc-b6bc-4ffe651ba3f8', 'W-Am: Who''s going with you to the technology convention?
M-Au:'),
    ('6cf9fa73-578d-43ca-ac3f-c2ae300ba723', 'W-Br: Will you be paying with cash?
W-Am:'),
    ('11c89afc-7f8c-4927-b79d-b1bbaad07826', 'M-Au: Why didn''t Karin apply for the position?
M-Cn:'),
    ('b498b925-3971-46d0-b4d9-274c1d209931', 'W-Am: Is the health-care lecture today or tomorrow?
W-Br:'),
    ('cc610fb3-fdf1-4fd2-ad5b-13d325cb5c3c', 'M-Au: Which train car needs to be inspected?
M-Cn:'),
    ('bba72615-0497-4674-bdac-edd65ae3726c', 'W-Am: Have you found a good doctor yet?
M-Cn:'),
    ('af7604b5-52db-44da-98b4-038d32c9a1a1', 'M-Au: When are we leaving for the airport?
W-Am:'),
    ('e5f0ca21-ec05-4747-94d3-61e8ddba3214', 'W-Br: Who''s taking the shipment up to the tenants in 3D?
M-Au:'),
    ('105a3196-23d6-483b-ad4f-b347abd20169', 'M-Cn: How can we advertise to different age-groups?
W-Br:'),
    ('2eaab727-b2d9-417f-88d8-76fdc66554ea', 'M-Au: I want to send this package to Texas.
W-Br:'),
    ('f91c133f-c4af-4359-a5e5-e7ad7bde6227', 'W-Am: Where did you put the instruction manual?
M-Cn:'),
    ('eabb0511-e422-4f83-9aa4-e182bdc0865c', 'M-Au: I hope Mr. Zhou likes our updates to the office design.
M-Cn:'),
    ('e7235dd0-54da-427f-af63-64e3882fd053', 'W-Am: When''re we going to hear from the architect?
W-Br:'),
    ('9977503c-5169-412d-994a-bd6e5b8086ed', 'W-Am: Could you remind me to call the cleaning service tomorrow?
M-Cn:'),
    ('311d52b6-6b0c-427e-867a-0c3e17219a0c', 'M-Cn: Who received the promotion to department director?
W-Br:'),
    ('e56ce0cd-6f97-4ef3-8457-bfe22df0481d', 'W-Br: Are there enough presentation packets, or should I get some more?
W-Am:'),
    ('e6443b9b-a45a-4f70-b481-4d5838a4bfc8', 'M-Cn: How do I volunteer to help with the company picnic?
W-Am:'),
    ('8cdefa3c-4464-43a5-891e-d5e1400dcc93', 'W-Br: Helen''s training the new interns, isn''t she?
M-Au:'),
    ('f52a5b6a-8d95-4323-9949-4b525ec07f88', 'M-Cn: Is the maintenance staff going to polish the floors next week?
W-Br:'),
    ('520c929f-a128-4e0b-90ba-e3a6a19ddbf1', 'M-Cn: Where should I park the delivery truck?
M-Au:'),
    ('103f11b4-c745-4220-bd9e-1ecdc4151c5a', 'W-Am: Would you like me to call you a taxi?
M-Cn:'),
    ('4aa02685-67dd-492c-bb89-e6ea1486af9f', 'W-Br: Didn''t Insook leave the store at five yesterday?
M-Au:'),
    ('584c28f1-281a-45fe-8b27-6341aa79052a', 'W-Am: You''ve placed your food order already, haven''t you?
W-Br:'),
    ('c3ffad13-2851-4b06-966f-6f57b464ebfb', 'M-Cn: What section of the speech do you want to start working on?
M-Au:'),
    ('6db1d11a-0978-432b-9cfc-2fc1dec78a8e', 'W-Br: Should we use the extra money on computers or on chairs?
M-Cn:'),
    ('6a720e51-4c7f-41bc-8cd0-7d5db7409484', 'M-Au: Ms. Sato can''t go to the board meeting today.
W-Am:'),
    ('d90e4dc7-7dbc-4e8b-bfd4-02d619e96bdb', 'W-Br: Why are you traveling to Melbourne next week?
M-Cn:'),
    ('a4b22f37-e800-44fc-b6ca-19088cbf6cd4', 'W-Cn: Who will add graphics to the slides?
W-Br:'),
    ('2ad857e4-805f-41f9-a698-9977558d519c', 'M-Au: Where is the maintenance office?
W-Am:'),
    ('79e9c325-6d70-4375-ab01-1753fe408fe6', 'M-Au: Would you like to pay for your sofa in monthly installments?
M-Cn:'),
    ('bc4a81ef-6177-4131-8c21-54eab721cd76', 'W-Br: When will the security software be installed?
M-Cn:'),
    ('abf7305a-ad35-46c4-8cd3-307c80c8405b', 'M-Cn: Why has our annual company retreat been postponed?
W-Br:'),
    ('3c4562ec-fc4c-4aea-aa41-5fd9e6b2af0e', 'W-Am: Does Ms. Bradford teach music classes online or just in person?
W-Cn:'),
    ('3369cfd9-05fd-4fde-8370-4a06a07d57cd', 'M-Au: What''s the fastest way to get to the new furniture outlet store downtown?
W-Am:'),
    ('862de940-e1e3-4366-a90f-f0ce5134d1b9', 'W-Br: Did you forget to order more disposable coffee cups in the large size?
M-Au:'),
    ('c250a314-ae52-4e1c-93bc-ea091e54af16', 'M-Cn: How long does it take for the wallpaper glue to dry?
W-Br:'),
    ('6be9c578-e7fc-4510-8fb1-ab46769a1e23', 'W-Am: Doesn''t this phone come with a free charger?
M-Au:'),
    ('b6d7199c-5001-4746-90f8-e42cdf51ce4b', 'W-Br: Who''s going to hang up the promotional banners?
W-Am:'),
    ('065ea45e-18c9-458e-965c-e2c826f36cd2', 'W-Br: How do you change the machine''s power settings?
M-Cn:'),
    ('61f53b5b-adb5-4235-b7ac-71a92346a9fe', 'W-Am: I''m ordering coffee for the team after lunch.
W-Br:'),
    ('a6dee0bb-682d-410d-bf95-68ee36c70091', 'W-Cn: They''re planning to offer vegetarian dishes at the staff dinner, right?
W-Am:'),
    ('06f630ac-854d-45b1-b95a-17e68e760287', 'W-Am: Oh, this Web site requires a password.
M-Cn:'),
    ('02468600-54e3-4890-9e2c-9d65ad93b720', 'M-Au: What can I do to give back to the community?
W-Am:'),
    ('49bc7fc0-ebf7-4955-a19e-30ca998afcf3', 'W-Am: Can you move the podium further away from the room''s entrance?
M-Au:'),
    ('0c47f0c3-65fe-44c0-9ed6-d2333f72e726', 'W-Br: Do we have any qualified applicants for the marketing position?
M-Au:'),
    ('00d21558-a67a-421c-876f-f18f7fde8ada', 'W-Br: I can be compensated for unused vacation days, right?
W-Am:'),
    ('f2b86b6b-ea65-4542-923c-e5e972e89eb5', 'W-Br: Where can I get my parking pass renewed for the company lot?
M-Cn:'),
    ('575ca18f-d28f-4acf-b9da-a18e8e6bcb5b', 'M-Cn: When does the company usually conduct employee performance reviews?
W-Br:'),
    ('aec948cb-9a01-4655-8d9a-51f4d36d5d4a', 'M-Au: To use the advanced hiking trail, can I go by myself, or do I need a guide?
W-Am:'),
    ('127a5276-feae-4bfc-a2fc-e329c1b416ab', 'W-Am: Can you forward me the itinerary for the trip overseas?
W-Au:'),
    ('c39319b1-0703-42df-83c9-8826cfccec74', 'M-Au: Don''t the building''s doors lock automatically after nine P.M.?
W-Br:'),
    ('49e5574b-d39a-427c-8086-7ccac9f5776b', 'W-Am: Why is the doctor running late?
M-Cn:'),
    ('c9392f7e-d493-42a5-8b68-a7522d08e9da', 'W-Br: Where can I find art supplies?
M-Cn:'),
    ('5adbaf6f-9a8f-485c-a5fc-dd8789b9f34e', 'M-Au: Who waters the plants in the lobby?
W-Br:'),
    ('a781bc59-1c8b-42ca-899c-4da469125212', 'M-Cn: Do you have a phone I could use?
W-Br:'),
    ('babe7602-1fa0-4f78-8ee6-c83e54260d8c', 'M-Au: How can we welcome our summer interns?
W-Am:'),
    ('ac01b5bb-94fd-47ba-9bd8-ec4405ef838d', 'M-Cn: When will the product testing start?
W-Am:'),
    ('32f94df6-adf8-4a2c-98c2-c6c10ef4d0b4', 'W-Am: Do you know the deadline for that project?
M-Au:'),
    ('da175afc-8356-4394-8d9b-dd8e11e03eb7', 'W-Br: What did you think of the job candidate?
M-Au:'),
    ('72f5234c-b40d-4ee8-8da8-b77e20f687c5', 'M-Au: Did you find a buyer for the Maple Street house?
M-Cn:'),
    ('676faf5f-fc15-4cc6-8067-69a1002b1dc6', 'W-Am: What do we have to wear for the company photo shoot?
M-Cn:'),
    ('4d0552de-7678-4196-b6c5-78f8ed9f249a', 'M-Au: That gallery''s been closed for months.
W-Br:'),
    ('e69035a6-1689-4196-839a-ef1e3100a430', 'M-Au: Could you design the event invitations?
W-Am:'),
    ('89f2d908-8dd1-4ee6-add2-2210662767cb', 'W-Br: This author''s last book was nominated for a Voss Award, right?
M-Cn:'),
    ('9f8a672e-3562-4f32-aa62-bfcf3744bf3d', 'W-Am: When will the roadwork end?
M-Au:'),
    ('fb4df595-abfc-481b-a618-6e88b5a19b2e', 'W-Am: Would you like that shirt in a larger size?
M-Cn:'),
    ('4944183f-ca92-479e-9369-cb299c7ca71c', 'W-Br: There are a lot of empty seats in the theater today, aren''t there?
M-Au:'),
    ('2da39d3f-c851-4f4c-88ef-6669f4855e08', 'M-Cn: When can I visit the factory to see the production samples?
W-Am:'),
    ('779d0a07-74fc-43ef-a2eb-35e8499bef6f', 'M-Au: Didn''t Ms. Oba tell us to call her when the printer was repaired?
W-Br:'),
    ('982db2ad-3597-48a6-b481-6995d6880e65', 'M-Cn: Will the keynote speaker arrive today, or is she flying in tomorrow?
W-Br:'),
    ('ed058a89-1b54-4a52-a24d-f1a534eeb155', 'W-Am: What kinds of articles do you write for the magazine?
M-Au:'),
    ('1244dc76-d985-4d55-b034-7058995e01ae', 'W-Br: How did you like Monday''s class?
W-Am:'),
    ('0d75dbc3-6b86-4510-b495-570b8b17e4c6', 'W-Br: Do you want to have dinner at the restaurant in our hotel?
M-Au:'),
    ('3c1f0404-921e-4756-ba97-520be8a7aad8', 'M-Cn: If the conference room''s taken, where can we hold a meeting?
W-Br:'),
    ('1cc95961-12a7-421d-9094-1fd6921bd8cd', 'M-Cn: I''m not sure we''re ready to play this song at the concert.
W-Am:'),
    ('d46fffff-fe5c-453f-aefd-513d93c65f4f', 'W-Am: Why don''t you load up the packages so we can deliver them?
M-Cn:'),
    ('c42262bb-b8e4-4983-a687-39d5d4064159', 'M-Au: When did you buy your new phone?
W-Am:'),
    ('009a0128-cedd-42b4-aaed-bed04e3ebc24', 'W-Br: Do you know where Keiko''s office is?
M-Cn:'),
    ('3b4735fa-c08d-41ed-be24-3ce4b5d85248', 'W-Am: That was a short movie, wasn''t it?
M-Au:'),
    ('cc36a018-cd40-4680-b915-39bb74b6dc5a', 'W-Br: Where can I find a building directory?
W-Am:'),
    ('abf95afd-bceb-4bd4-a501-4ba902296c65', 'M-Cn: Who''s going to lead the merger negotiations?
W-Br:'),
    ('0cab7a26-efdc-47aa-8500-b9fb81cd3026', 'W-Am: How do I contact the financial consultant?
M-Au:'),
    ('2c27638b-7f31-4788-a1c3-9287798fad11', 'M-Cn: When is the health inspector coming?
W-Br:'),
    ('22e68bce-9935-4af9-9064-16bafda55a7c', 'W-Am: Wasn''t this assignment due last week?
M-Au:'),
    ('875b3e13-6e7a-44db-9df9-62e66bd4dc99', 'W-Br: Whose turn is it to buy coffee?
M-Cn:'),
    ('f60e2a8c-b2b4-439f-81d7-3b26d3889f73', 'W-Am: Where will the company retreat be next year?
W-Br:'),
    ('ecf069a3-5f63-4aa8-943c-c354a9a39142', 'M-Au: Let''s discuss the building designs this morning.
M-Cn:'),
    ('855c70d5-5562-4c08-bd34-4415586e3531', 'W-Br: Why is there a cake sitting out on the front desk?
W-Am:'),
    ('b53ce7f8-29cf-42b7-8cfe-cab7330e3915', 'M-Cn: How are we going to move all of these office chairs?
W-Am:'),
    ('6ee6b269-7f62-4b44-a738-b43450197bb8', 'M-Au: Have you gone to the leadership training yet?
W-Br:'),
    ('374c90bc-d78e-4e65-ab8f-18877fb765bc', 'W-Am: Why don''t we start marketing to a younger audience?
M-Au:'),
    ('f2b48cde-5e26-489c-a14c-da22f32c5c34', 'M-Cn: What kind of tablet computer do you have?
W-Br:'),
    ('ebbdd6bf-f65e-4c5c-991a-48f401b81cfc', 'W-Am: Wouldn''t you rather travel somewhere during your time off?
M-Au:'),
    ('e6ac4086-6ac8-4df0-aaec-ada3bb8b99e2', 'M-Cn: You gave the customers the bill, didn''t you?
W-Br:'),
    ('4279f445-55e1-46e4-a163-80a17c7ac4ac', 'M-Au: How soon can you finish the Sterling report?
W-Am:'),
    ('0636ff80-ebd0-4636-b951-574858447796', 'M-Cn: Would you like your receipt now, or shall I put it in the bag?
W-Br:'),
    ('d1a21b42-2c90-420a-8b61-b01490d2eade', 'W-Am: The registration deadline is on Friday.
M-Cn:'),
    ('7eab1cfe-ffbc-4cd4-bac3-33713faf1d9c', 'M-Au: Your airline has an overnight flight to Delhi, doesn''t it?
W-Am:'),
    ('874ecb04-a754-4466-b3bb-602a86017c13', 'M-Cn: I can''t seem to open the file you sent me.
M-Au:'),
    ('93df3ae5-58db-4ed0-9817-a11123754cc4', 'W-Br: Would you like to include breakfast in your room reservation?
W-Am:'),
    ('98538807-297d-49ba-b185-f5fd9b2a2002', 'M-Au: Should I print copies of the budget for the meeting or e-mail it to everyone?
M-Cn:'),
    ('e9c7e976-41b5-4321-a878-cfe4247ce0b5', 'W-Br: When can we pick up the building permit?
W-Am:'),
    ('5e38a7b4-a123-4033-ba50-588e0ca6eb10', 'M-Au: Do you want anything from the convenience store?
M-Cn:'),
    ('7c79c534-3f15-4654-a676-52d817f6d3f7', 'W-Am: Would you like to sign up for our loyalty program?
W-Br:'),
    ('fcd12444-1790-4502-83e8-9df4099dc00c', 'M-Au: Thank you for writing a recommendation for me.
M-Cn:'),
    ('9a0ffd58-88a3-4c1c-b134-f4f363ecac31', 'W-Am: Is the university library open to the public?
M-Cn:'),
    ('c16d0f11-5bbb-443e-8a26-f5b06b891b09', 'M-Au: When is the airport the busiest?
W-Am:'),
    ('e3fedb66-67c4-446a-9d4a-c0120b676a21', 'W-Br: Are there any good restaurants near the conference center?
M-Au:'),
    ('e4a53e97-8908-44a9-9fa8-ac0ae3bd672a', 'M-Cn: Your company is based in Toronto, right?
W-Br:'),
    ('f901a032-e325-4c63-99ce-ab4965f0a584', 'M-Au: What should I bring to my first appointment?
W-Br:'),
    ('963bbccd-f348-4990-9ef0-8c6b128047aa', 'W-Am: How many items are there on today''s agenda?
M-Cn:'),
    ('45e48ea7-6625-43d5-880c-4a48eaa50eaf', 'M-Au: I''ve found some job candidates who meet your requirements.
M-Cn:'),
    ('91401c2c-2764-4ea3-b41b-860ed0539c69', 'W-Am: Where''s the taxi we ordered?
W-Br:'),
    ('57415a5f-079c-4db6-88a0-8189093b404d', 'W-Am: Isn''t this year''s workshop a little longer than usual?
M-Cn:'),
    ('1f15f287-7a35-4219-ad3d-f7f8e7df9feb', 'M-Cn: Would you rather take a tour or just explore the museum on our own?
W-Br:'),
    ('b5e297e9-24ec-45ab-ac80-6087a51f2ba8', 'W-Br: You''re announcing the price increase to our clients, aren''t you?
W-Am:'),
    ('bcea79c1-fac8-4b6d-964f-6c8b4d381cd8', 'M-Cn: Why are all my photographs out of focus?
W-Am:'),
    ('b9a5217e-1480-45f4-8f47-64b60fd3abcf', 'W-Br: Where did you get your travel mug?
M-Au:'),
    ('d737ad09-8bd7-47e7-ab10-09c9b9c78fb2', 'M-Cn: Why aren''t you inviting local businesses to sponsor the festival?
W-Br:'),
    ('eb45f4cc-3674-4d5b-b73a-569071d8c751', 'M-Cn: The floor tile shipment has arrived.
M-Au:'),
    ('6b90f013-0dd9-47cd-995b-1c12368200a7', 'W-Am: What are the main ingredients of this dish?
M-Cn:'),
    ('9a696b24-c50e-43dd-bf9d-3c10668ed39c', 'W-Br: Who from our department volunteered to help with the holiday party?
M-Au:'),
    ('79cf0206-e73d-4260-a69a-20973ba06797', 'W-Am: Shouldn''t we schedule a time to practice our presentation?
W-Br:'),
    ('40febea1-0304-4388-abc7-1e50748b387f', 'M-Cn: Where can I find the outdoor swimming pool?
M-Au:'),
    ('a13422f6-d4ad-42d5-9e60-7dd8aff122d5', 'W-Br: Don''t you usually work weekend shifts?
M-Cn:'),
    ('36fb094e-e8e5-4d14-99e8-3e6e2d65f178', 'M-Au: Who can I talk to about a problem with my company laptop?
W-Am:'),
    ('ad6fefe2-27ae-4c8d-8c42-46373e809bc8', 'How long will the renovations take?'),
    ('66eb0234-9114-4633-88d6-af644efd113e', 'What is the factory''s inspection process like?'),
    ('b68b4bcd-a91c-45d5-8ba4-3453426909c6', 'Hasn''t our merchandise arrived yet?'),
    ('a72e041c-051b-45aa-8381-e9f2c5b8e152', 'Who''s buying beverages for the retreat?'),
    ('8326943e-4e9a-4896-8b4e-d6999c577bae', 'Why is the reception at a different location?'),
    ('8f89dfcb-d341-4088-bdd2-4440c7ca14ef', 'Would you like me to process your travel voucher?'),
    ('bd29aa66-a89f-4172-88fb-3a9a9b5846c6', 'How far away is Azuma''s Dry Cleaning Company?'),
    ('129dab78-08f0-4794-80d6-bfdccec69168', 'Do we have the registration forms ready for the students?'),
    ('00d9f83d-e6a2-41d7-9ed7-5b226e957b14', 'I could provide you with a copy of the lease.'),
    ('306234e0-7c99-4b88-9323-a1c15597a985', 'How many oil changes are scheduled for this afternoon?'),
    ('247b4ade-6e7f-4be7-b369-7bf97402630a', 'When was the last time you traveled for business?'),
    ('b26be86b-8af5-4422-914d-cd314ce1b91a', 'Should I order the parts online or over the phone?'),
    ('5fa3c442-88fc-450e-95d4-ab42e130fb24', 'Where should I pick up my conference badge?'),
    ('6644b806-702f-44b0-8ee5-d26967a1f3d7', 'Isn''t the computer network running a bit slow?'),
    ('64789f5b-1773-4500-8728-aee4ae5da70c', 'How do you like this office space?'),
    ('7f9a2c7e-a5be-48c7-9428-0618156b6975', 'You can use the company van to make your deliveries.'),
    ('94438e9f-5d0e-4fcd-8b2a-31a75d15989f', 'Isn''t the city council meeting tonight?'),
    ('c5fb4e5b-4b47-483d-ac6d-4ef8aa6868cd', 'Could you look at the revised logo tomorrow?'),
    ('0f6a077d-8406-4382-92cc-a35e54669852', 'Is the business local or national?'),
    ('8d6c6197-9d01-4815-9e42-e688428c66dc', 'How do you make sure your products will sell well?'),
    ('c5b9a208-957f-44ff-893e-1f9dcd31b100', 'Who will fill the open manager position?'),
    ('f6ba0386-afdb-409d-a19a-5b2ce968df38', 'Where do you want to store the extra brochures?'),
    ('c2208b6e-36af-4c84-a762-d00978935132', 'The new bottling machine''s been installed, hasn''t it?'),
    ('3fab4ce4-ff37-4da0-b612-8c63cb44283c', 'Shouldn''t we update our security protocol?'),
    ('4f8056dc-6b87-4409-b6f3-a2ac37d015a2', 'The engineering team would like to meet sometime today.'),
    ('81828d49-287b-4ab8-8e5a-7b9d919a571d', 'M-Cn: Why were you late for work today?
W-Am:'),
    ('80e1e922-0206-4d99-b23b-a4cc4b27a98b', 'M-Au: Where''s your apartment building located?
M-Cn:'),
    ('7aad2c97-3a8f-429c-aee6-6308ed5dc9f5', 'W-Br: Which flavor ice cream would you like?
M-Au:'),
    ('b8613614-01ec-4e0b-ad7a-4cf622c75cc7', 'M-Cn: Who''s going to pick up Pablo from the airport?
W-Am:'),
    ('f52ab7ce-2633-4d18-9240-05a42c49359a', 'M-Au: Where''s the train station?
M-Cn:'),
    ('fa0e584d-438c-4adf-8c2d-8ac8e84e8ca4', 'W-Br: When will the cleaning products be delivered?
M-Au:'),
    ('c9f05946-ffda-4d3a-9941-04f48e1d6810', 'M-Cn: We haven''t received the electric bill yet, have we?
W-Br:'),
    ('b48825ca-4c46-46f8-953b-2edb1a9fa66b', 'W-Am: How did you enjoy your stay?
W-Br:'),
    ('1a175040-0c5a-4c6a-b5d4-256454c2e97a', 'M-Au: Who won the Employee of the Month award?
W-Am:'),
    ('59efcf31-7d33-4514-aacd-262c84fca1c2', 'W-Br: Do you want me to reserve a ticket for you?
M-Cn:'),
    ('8fc6ed67-612a-4ac3-8d59-f07ba05e747c', 'M-Au: Does your bus stop by the construction site?
W-Am:'),
    ('87f57829-1276-4f9d-a5cc-8e68fd29cd4f', 'M-Au: There''s a discount on this stove, right?
W-Br:'),
    ('d63f7598-3ecc-491e-9aaf-6bf3a49e5690', 'W-Am: Could you show me where the electronics department is?
W-Br:'),
    ('d4b21f77-1236-4c4c-8ec3-95d04950e1ac', 'W-Br: What''s this shirt made of?
M-Cn:'),
    ('3a542e78-dc93-41ed-bfaa-dd045a4ef0eb', 'W-Am: Will the social media workshop end before six P.M.?
M-Cn:'),
    ('507b47d7-360e-4e9e-8cb4-a7822c562529', 'M-Au: Which suitcase do you like better, the yellow one or the red one?
W-Br:'),
    ('ddf9a119-934b-4ffa-aa1c-bebb0c28fc7f', 'M-Cn: The parking area in front of the warehouse''s been closed.
M-Au:'),
    ('b16e39a0-c4cc-451f-afe4-a45de691b2e3', 'W-Br: These shoes look nice, don''t they?
W-Am:'),
    ('3442d04c-87ee-463d-a89b-55b038d0e473', 'W-Am: Let''s leave early for our lunch with the clients.
M-Cn:'),
    ('73acc01e-43fe-4816-afac-7cb49601d247', 'W-Br: When will you sell your property?
M-Au:'),
    ('d47efefd-8763-4752-a98e-feaa3e72d40a', 'M-Cn: These business cards are attractive.
W-Br:'),
    ('92152734-a8d9-4a04-91bb-16561e77faf0', 'W-Am: How long does it take to become a plumber?
M-Au:'),
    ('0edb2f10-0f9f-42a8-aa6e-ac193bb04d8e', 'M-Cn: Don''t we have an extra table in the supply closet?
W-Am:'),
    ('a5cf26b6-b81e-47d1-a6e1-0f0a33534d53', 'W-Br: Where should I go when I visit New York?
W-Am:'),
    ('04e3ad24-d285-472c-b959-f91606482bfe', 'W-Am: Has someone booked a room for today''s budget meeting?
M-Au:'),
    ('c0f739e0-3b91-4b6c-9311-a2fc926e88b3', 'W-Am: Could I borrow your pen?
M-Cn:'),
    ('08fba97b-96c1-45e4-aa10-fa676618ad6c', 'W-Br: What''s the price of this item?
W-Am:'),
    ('840f0cef-569e-46cc-985e-615043dc352c', 'W-Br: When do you usually take your lunch break?
M-Au:'),
    ('4528f2d4-9649-4fba-adb6-8ea5533fdb56', 'W-Am: You got the concert tickets for Saturday, right?
M-Cn:'),
    ('df32268e-8f35-4db0-8812-9594b6258532', 'W-Br: How did you hear about our zoo tour?
W-Am:'),
    ('de3e7398-65fb-45bb-98f4-a3dc165bea83', 'W-Am: What is required to get a store refund?
M-Cn:'),
    ('5b961a40-ce01-44a7-9751-929b5fe194a1', 'M-Au: Why is construction on the new apartments delayed?
W-Br:'),
    ('3b0b22ac-e09d-4eca-8770-d1e67124c205', 'M-Cn: How do I open a new account?
M-Au:'),
    ('f48e119e-ad62-44ac-bd4d-37f5653ff688', 'M-Cn: Have you installed the new computer software yet?
W-Br:'),
    ('a8ceeed4-c73a-451f-8dce-71da466e16dd', 'W-Am: You haven''t seen my scarf, have you?
M-Cn:'),
    ('97c84e37-3bf4-4ccb-860b-2d81c6e9b1d5', 'W-Am: Who was the spokesperson at the press conference today?
W-Br:'),
    ('4b70030e-b5bc-41a5-b0e3-b583738d6746', 'M-Au: How much do you think the banquet tables will cost?
W-Am:'),
    ('a609aa8c-e0cb-4a6e-bda4-435ce4a6fc6c', 'M-Cn: Where can I find the corporate handbook?
W-Br:'),
    ('29b2390b-4d06-4e50-8164-432b13101390', 'W-Am: Would you like to pay in cash or with a credit card?
W-Br:'),
    ('535f4afd-1e7c-42f2-baf1-15b83b186165', 'W-Br: When will the prototype be ready for production?
M-Au:'),
    ('f2f65d19-8c02-420f-9cf8-31f03e5484f4', 'M-Cn: It looks like the restaurant didn''t deliver my salad.
W-Am:'),
    ('40d0746a-2e96-43d6-96ea-f6803103e73a', 'W-Br: Why don''t we have a quick meeting at four?
M-Au:'),
    ('e19e080c-1681-4154-b39a-fdf67e601890', 'M-Cn: Do you think we could modify the project timeline?
M-Au:'),
    ('dd4d99ac-8f29-4e2f-8683-b573b6e39e5e', 'M-Au: Can I leave a message for Mr. Oyama?
W-Br:'),
    ('fbbcf676-63c4-40ff-af29-03e9d2e45d1a', 'M-Cn: Doesn''t this elevator go to the twentieth floor?
M-Au:'),
    ('8744e7f8-9a27-4b42-aed3-4ee000a7aa7e', 'W-Br: Who wants to lead the accounting workshop next week?
M-Cn:'),
    ('ca1c7f92-afff-469c-ac06-e865d3bfcb19', 'M-Au: Where will this year''s trade show take place?
W-Br:'),
    ('547b95a2-8d4c-430c-9b66-3cbb976e7822', 'W-Br: Shouldn''t I have received shipping confirmation from your company by now?
M-Au:'),
    ('740ceacf-075d-479b-8a49-b19c7f9037e6', 'M-Cn: I have a complaint about yesterday''s catering service.
M-Au:'),
    ('1974c8ff-043c-4e6f-8efc-5b20d8941e0b', 'M-Au: Why were our car sales so low this month?
W-Am:');

INSERT INTO migration_part2_question_text_20260811 (question_id, question_text) VALUES
    ('7a43c7e5-6209-427b-80d9-74813eacbb8c', 'W-Br: What does the holiday package include?
M-Cn:'),
    ('107bb570-cd65-412d-aec9-6ff11c9701a1', 'W-Am: When''ll the factory inspection take place?
M-Au:'),
    ('53794c04-e8cb-4c5f-9c9b-7cdb8a54aabd', 'M-Cn: Where can I buy tickets for the next exhibit tour?
W-Br:'),
    ('30a2abbb-081a-484d-88e8-5ead955d9eed', 'W-Am: Isn''t our new coffee excellent?
M-Cn:'),
    ('3b099f3a-4cab-4b41-bf7f-f2abcd583c97', 'M-Au: When is the new copier arriving?
W-Br:'),
    ('b6f36abb-07f2-456d-b4e8-019c08c772de', 'W-Am: There''re boxes in the storage room, aren''t there?
M-Cn:'),
    ('22764cf3-d55a-4e3d-ab55-823dbaf57bac', 'M-Au: Karen, would you finish the presentation slides?
W-Am:'),
    ('9c4b55e9-ad9f-441f-8f3e-e6dae281411f', 'M-Cn: Will you be dining here, or would you like your food to go?
M-Au:'),
    ('675b234a-6eb4-4bce-ae85-45a9b12bde94', 'W-Am: Why is Alan working from home?
M-Au:'),
    ('66fad8c2-c8af-43c8-a6b1-e743dc3587ce', 'W-Br: We''re leaving at five for the holiday party.
M-Cn:'),
    ('d6dcf8bb-363b-403f-8513-26f501aa4cb9', 'W-Br: How did you manage to fix your computer?
M-Au:'),
    ('dad8c3d6-57e5-4931-9f89-96d671aebd74', 'M-Cn: Should I take the train to the conference center?
W-Am:'),
    ('f98d29f0-823e-4c62-b6e3-af5a72a2d652', 'M-Au: Didn''t you buy more postage stamps last week?
W-Am:'),
    ('e8ceec9b-dcd5-46a7-9331-60e45f21d71c', 'W-Br: I think last year''s technology trade show was better.
M-Au:'),
    ('defc5839-2bd9-44b5-9f2a-423fffb70e6d', 'M-Cn: May I borrow your stapler?
W-Am:'),
    ('865cad8b-ae7d-4544-863b-6076ee7e92d3', 'W-Br: Who should present their research at the seminar?
M-Cn:'),
    ('af1de703-b546-48fe-bc5a-4c13f2924098', 'M-Au: Why have our sales decreased recently?
W-Am:'),
    ('91038c6f-2693-4d8b-a391-3be82eb255cd', 'W-Br: How is your new department manager doing at his job?
M-Au:'),
    ('cffd9d46-2ac3-4a6f-a101-f2683a0bb652', 'W-Am: Do you know if there''s a break after this talk?
W-Br:'),
    ('66ee1056-e6e5-4e92-a0e8-28a9ff2a670e', 'W-Am: Where can I charge my mobile phone?
M-Cn:'),
    ('9906f3df-1f4d-424d-8670-71d5de373a28', 'M-Au: Which room can we use for Thursday''s client reception?
W-Br:'),
    ('4afd272c-35c0-4adf-a088-533e6bc1c228', 'M-Cn: Are you going to accept the transfer to New York City?
W-Am:'),
    ('1823dacc-c91b-4ff4-a465-8857febad35a', 'M-Au: Should we call the client before or after the staff meeting?
W-Br:'),
    ('f9afa6ca-7b04-487d-891f-83f50e66e612', 'W-Am: This purchase order needs a signature.
M-Cn:'),
    ('f355532e-8ba5-4176-bc9e-f1ed994d8c28', 'M-Au: It wasn''t supposed to rain today, was it?
W-Br:'),
    ('f249d002-3fa5-4ea0-b18c-31083ce58b03', 'W-Br: Who made changes to the budget proposal?
M-Cn:'),
    ('a6e5a04e-5dfb-4c27-b264-bff628fcbd3b', 'M-Au: When are they delivering the manuals?
W-Am:'),
    ('ccdcbd41-5289-4b02-97e2-e98b94f1a6fb', 'W-Br: How much does it cost to rent this retail space?
W-Am:'),
    ('d9ac31db-beda-4345-92cb-42b390dbda8b', 'W-Br: Where is the store manager?
M-Au:'),
    ('bd5c4a1a-ddea-4b6b-bb67-768e7e87ed1b', 'W-Am: Should I turn off my computer or leave it on?
M-Au:'),
    ('00cc3646-8891-43e7-b429-627f96c3f17c', 'M-Cn: Who has attended a public speaking workshop before?
W-Am:'),
    ('c621005a-e7a5-400c-b3c3-1f7f26c57241', 'W-Br: Why is Min-Soo selling his car?
M-Cn:'),
    ('1ccaf02b-3fb2-487a-a979-fde31a9a6994', 'W-Am: When should we call the client in Beijing?
M-Cn:'),
    ('03696306-d01a-48c0-a143-852f502df1d9', 'M-Cn: Where should we set up the packaging machine?
W-Br:'),
    ('aca12ff6-f4e1-4e14-975e-7328353e286e', 'W-Br: Who will we purchase costumes from?
W-Am:'),
    ('35d6271c-e12b-4dae-b35c-a0fddbdf71b0', 'W-Am: Isn''t the building inspector coming this afternoon?
M-Au:'),
    ('af1687a8-8428-43ab-83bb-8b84d61a60dc', 'M-Cn: Do you have an appointment to see Ms. Singh?
W-Am:'),
    ('0b517283-2257-463a-a231-77381ef9856e', 'M-Cn: I could let you know when we have a job opening.
W-Br:'),
    ('b7238012-6acc-489a-9c0e-fd1b0a13ece4', 'M-Au: What kind of business are you interested in launching?
W-Am:'),
    ('0e5809d8-d43b-4384-8d53-af33f0a3dc15', 'W-Am: When did this pharmaceutical company move to this larger facility?
M-Au:'),
    ('b3391569-c2d6-42ce-b89b-28cb225c1fa9', 'M-Cn: Ms. Johnson will be coming to today''s meeting.
M-Au:'),
    ('80072096-be14-4f88-8cdc-b43b62eeb6ac', 'W-Am: I''ll need to update the software, right?
M-Cn:'),
    ('7acad40c-386a-43a3-b15f-5240277b17d1', 'M-Au: Where''s the museum''s sculpture exhibit?
W-Am:'),
    ('7684be92-6ccf-4039-aa0c-0d1f2f357e29', 'M-Cn: Why don''t we interview the two candidates together?
W-Am:'),
    ('10ce76e0-8650-4174-942a-284fed4e3b1f', 'M-Cn: This research report is unusually long.
M-Au:'),
    ('70ffbd7e-8ae9-4731-a54b-f9773681389d', 'W-Am: We reserved a booth at the festival, didn''t we?
W-Br:'),
    ('68419afc-3448-46f2-89f6-aef1fee9e60d', 'M-Cn: Could you help me draw up a contract?
W-Am:'),
    ('ea08b109-9583-47f1-92ea-18ffca30529f', 'W-Br: What are your dinner specials this evening?
M-Au:'),
    ('86d085bd-795d-4caf-a1cd-b70935b29a30', 'M-Au: Have you signed up to access your medical records online?
W-Br:'),
    ('4e3e3fc6-161d-42f1-941b-a9c6db8bf707', 'W-Am: Didn''t the office manager order more company letterhead?
M-Cn:'),
    ('d579a620-a8a6-4afc-8acd-f45c395b3fed', 'Who’s responsible for hiring at our fitness center?'),
    ('a593f126-30b9-4df0-8b61-a7bd31a1dd36', 'Where do you usually purchase office supplies?'),
    ('e6c79353-ee44-4fea-ab95-36f4b978e17e', 'What time does Mr. Park usually leave?'),
    ('b5d95e85-485a-4c29-9521-98f629e52afc', 'Do you want to present your research to the marketing team?'),
    ('d0a96abe-a0fc-4816-8b8b-70f5ad84d469', 'Our company picnic is on Friday, isn’t it?'),
    ('4795d919-3d43-49f1-9c01-b537b45f2e56', 'Isn’t the bus supposed to stop here?'),
    ('c27c445a-14fd-4aad-b5b5-b9a4665e8180', 'We should fill this order quickly, shouldn’t we?'),
    ('a5c01a39-aa2a-4479-a1f9-c6c5979b2943', 'How do you like your new job?'),
    ('dc82d53a-6c38-4e04-b43b-6b09074dc5a1', 'Let’s go to the cafeteria for lunch today.'),
    ('198a0da0-b00e-41db-8769-c65645424645', 'When will we hire the new interns?'),
    ('9dbd5388-fdd0-4b8c-9d42-5c4caec6ea07', 'How often should I mail these statements?'),
    ('0ea6d8d9-93df-43e7-8085-a4f1234a59b4', 'Why did you put that food in the freezer?'),
    ('a7cd4c80-d54b-4b49-9356-66d49c35a1eb', 'Could you print the agenda for the meeting?'),
    ('90e72c61-2ec7-4346-883d-65fca8c711c6', 'How far are you from the clinic?'),
    ('217f236c-c64e-4284-a29e-a7ab7345e1ab', 'Didn’t you get a printout of the company newsletter from Emiko?'),
    ('93fe64d6-d1a8-4d12-aefa-0224ad9c0da2', 'When do you need to renew your passport?'),
    ('4c462d8e-beb7-412d-a668-fc9582afb3f6', 'Who can help me find replacement parts for my computer?'),
    ('79e1c71c-2ffe-4a25-a429-32d3748bdb82', 'I can’t make it to the company dinner tonight.'),
    ('88952f13-3075-4f37-ba4e-d27a14c0aa0d', 'Do you work in this neighborhood?'),
    ('d41e3790-2fb6-4541-8360-8288f8e4ce09', 'It’s time for our quarterly earnings report, isn’t it?'),
    ('02779306-ee1b-4e72-998e-bd9a725ed5f1', 'What did you do with the guest list that I sent you?'),
    ('3093238d-3f33-411e-95a1-a30f10522671', 'Did you see the announcement about Emily’s promotion?'),
    ('e7b81f28-6412-48ba-a9d1-83588a9fb8e7', 'Let’s try our best to finish the project on time.'),
    ('122c1ff8-0162-418b-b4e8-0853023bb8d3', 'Where’s the store manager?'),
    ('edbcf6b9-683f-40b5-b7e9-6876546f31d1', 'The software you’re using isn''t very reliable.'),
    ('9d8cee7b-5a0c-4680-b22d-acb7599962f7', 'Which theater did you go to?'),
    ('f6ec7eeb-8436-4e26-97aa-fa839af9a92b', 'What’s the last day to complete the survey?'),
    ('52a9f378-ad04-4371-801d-3ba8ebd20beb', 'When are you planning to move out of your apartment?'),
    ('39a1b4e3-a520-43f0-95bb-13ad8750b378', 'When does the show begin?'),
    ('4321e342-5846-4343-9160-153588a04832', 'Who will be leading the new team?'),
    ('8edf659e-11cd-414a-8028-f94ec650f6b3', 'Why was your flight delayed?'),
    ('8d2d2ba1-141a-4ea4-8cac-87af990afddb', 'Where are you planning to open your next store?'),
    ('6289b896-1c99-4795-862b-38484a9c36e7', 'Who designed the uniforms?'),
    ('e9f5f70a-c44b-4e59-8ae1-5cb71e048d0a', 'I recommend the vegetarian dinner special.'),
    ('8463e667-c9cf-438e-bc00-fdbd21e089a7', 'How will we get this order filled in time?'),
    ('e7ac2922-96d7-4e9a-a2aa-b458e93dac5a', 'Do you have the gate code, or should I look it up?'),
    ('cd15ad8b-57b3-48ff-adea-dcb5463e39e3', 'Should we visit the warehouse this week or next week?'),
    ('af25dfc6-d31b-4888-bb57-961abaaab0fc', 'Don’t you want to come to the employee luncheon?'),
    ('3c51702f-3ae6-4cad-91be-51df1aacb113', 'Could you recommend a local hair salon?'),
    ('9910d80c-c301-4f30-8169-89539a2ad29c', 'I have some documents here for you to sign.'),
    ('df4e703b-977e-445f-bee0-53dda8937211', 'Are you planning to dine in, or would you like to take your food with you?'),
    ('8c037d48-8161-49e4-bf1a-c0bfcdb4dc0a', 'Is this carpet the right size for the room?'),
    ('77aa7592-f144-476c-8324-f8e4f2ef08d0', 'You’re aware that it’s been six months since we’ve done inventory, aren’t you?'),
    ('9ea18ec6-5f9b-454d-8e49-968b667e3e83', 'I need to know who’s attending the exposition.'),
    ('fec72b22-4b81-4b2b-83d6-137853ccd315', 'This computer is becoming quite slow.'),
    ('624c88c4-790f-4b90-988b-3cacac33e424', 'Do you know if these towels are 100 percent cotton?'),
    ('5e75e493-5a73-4c5b-af80-283395265f8c', 'Shouldn’t you send these manuscripts to your editor?'),
    ('1aed648a-8143-4cde-9aa3-579f3291777a', 'I don’t think Mr. Chen is back from his business trip yet.'),
    ('7e5ec31b-a804-4e6b-bd06-e497906a0861', 'Where is Barbara''s office?'),
    ('77d7f709-c965-4b44-997f-345eb15be06c', 'The stage entrance to the theater was moved to Fourteenth Street, wasn’t it?'),
    ('00d78345-2db4-4a2d-bbba-36b441dfbf1e', 'W-Br: Which restaurant did Mayumi recommend?'),
    ('77d97dd6-2058-47de-8e9e-0bd9a01ef386', 'M-Au: Could you find a different shirt for that customer?
W-Br:'),
    ('0a250ae8-13e8-457f-b104-caaad3f2a21c', 'W-Am: When did you send me the invoice?
M-Cn:'),
    ('5cce3c98-3cea-4654-99ce-1f11b94ac894', 'M-Cn: Where''s the computer programming handbook?
W-Br:'),
    ('6265d7d0-022b-4ecb-ac54-91d6d92abd35', 'W-Br: Isn''t Mr. Akbari leading the accounting seminar?
M-Au:'),
    ('2a647e08-f855-4376-8d26-e6720e9b38c0', 'M-Cn: Why is traffic so slow today?
W-Am:'),
    ('8dade98f-2e4d-4425-acb8-188c361e116e', 'W-Br: Let me help you fix the scanner.
M-Cn:'),
    ('1ad24888-808e-4253-a92c-1b5bd1fb29cb', 'W-Am: Is there a code to unlock the door, or is it open?
W-Br:'),
    ('82cae82a-8753-42c8-a687-632ca3acde69', 'M-Au: What color folders would you like me to buy?
M-Cn:'),
    ('54c6a581-0876-4aa2-9022-2ce0b77c200a', 'W-Br: How can I request expedited shipping?
M-Au:'),
    ('9d288ff3-e3e0-4e20-b61a-d1c7ff4cce3e', 'M-Cn: Don''t we need to purchase more fabric samples?
W-Am:'),
    ('de0c0abb-4972-44f3-b831-4f82ae8d4a2f', 'M-Au: Where can I find the Human Resources department?
W-Br:'),
    ('dac9dd6c-30da-487e-9d26-b2bdf3d260db', 'W-Br: Who did you speak to about renting the apartment?
M-Cn:'),
    ('447053df-fd56-4428-bad8-f36e8b701b16', 'W-Am: Are you going to the museum or watching the baseball game?
W-Br:'),
    ('3669b0a8-34c4-4661-95ba-cf6568a5fc54', 'M-Au: Would you like me to review the budget report before you submit it?
W-Am:'),
    ('af8cebee-0157-45b8-8dea-62380002a234', 'M-Cn: Do you plan to walk to the convention center?
M-Au:'),
    ('a8e165b8-7697-493f-9832-1be11a076e36', 'W-Br: We''re out of flyers for our weekend sales event.
W-Am:'),
    ('de0aa521-0d6e-46e2-9347-f61267ded293', 'W-Am: Weren''t you planning to see a concert tonight?
M-Au:'),
    ('8206d4ed-eacf-47ff-bb08-5bddb6dd04a3', 'M-Cn: When will the presentation materials be ready?
W-Br:'),
    ('546d06da-0d57-477c-8fcc-f2297d46b36c', 'W-Br: Who''s working the closing shift next Monday night?
M-Au:'),
    ('128fd783-c146-4954-b758-6d6c09e9b27c', 'M-Cn: Can you call the Research Department to get a project update?
M-Au:'),
    ('8a08bfb3-7cd6-4265-bd58-2cec8e301af9', 'W-Br: Doesn''t the dentist''s office open at seven A.M.?
M-Cn:'),
    ('8bc1c895-2efa-4458-b4b6-d983bb0b38ff', 'M-Au: The supplier said the cabinets will be delivered late.
W-Am:'),
    ('532a3be5-9795-47ec-b145-be26343708bf', 'M-Au: Ms. Jones arrived at four today, didn''t she?
W-Br:'),
    ('ef128b68-f436-4ec8-819d-dcfd99820033', 'W-Am: How long did the team meeting last?
M-Cn:'),
    ('5ddc1cd6-2e82-4cca-ad2b-a0d0b4aa6df4', 'W-Br: Who''s picking up the newspaper?
M-Au'),
    ('0a424829-371f-44d4-a640-c2d9353a2f6c', 'W-Br: When is your doctor’s appointment?
M-Cn'),
    ('d2250ac8-0e88-431d-9517-8075524b2d9b', 'M-Cn: Why don’t we have a company picnic?
W-Am'),
    ('17fd5caf-6a13-4380-b0c4-0168cc0fa489', 'W-Br What do you think I should take to the conference?
M-Au'),
    ('a3f94ee6-6266-4295-ad47-fb567bae5903', 'M-Au: Where’s the festival being held?
W-Br'),
    ('286eac29-6ae6-46fc-8a50-f13021a05bed', 'M-Au: Who do I present my proposal to?
W-Am'),
    ('50a40474-ef6f-4f3f-b0a9-5f0b35638030', 'M-Cn Could you please look up the location on your phone?
W-Am'),
    ('6610f308-5c86-48a3-922a-35307b490669', 'W-Am: Isn’t the accounting seminar tomorrow?
M-Au'),
    ('e9131cfd-8d8e-4c11-a126-24c857b85837', 'M-Cn When’s the dishwasher being repaired?
W-Br'),
    ('5f9a55db-5e6b-48f5-982d-e17a4d80fb60', 'W-Br Should we move the employee lounge to the basement?
M-Gn'),
    ('c3dbf6d9-3be6-45cd-bb1b-a71532c24e7a', 'M-Au You changed the color printer cartridge recently, didn’t you?
W-Am'),
    ('d8bcea5a-9ec8-496a-8b7e-4d75320defc5', 'W-Br We’re not going to be able to fit everyone in this space.
M-Au'),
    ('a0dd86f8-8dd4-446e-b85d-d3aeb21799d6', 'M-Cn Is it easiest for me to take a bus to the city center?
W-Am'),
    ('8c843f5a-8098-4ade-bc3b-a9daa65f15d4', 'W-Br Are you able to make a prototype soon?
W-Am'),
    ('d126fd03-22bc-46cb-a9da-93db3c1ded19', 'M-Cn Where can I buy a lamp like that?
M-Au'),
    ('4244778e-0163-4727-ac0c-357a8e945094', 'M-Cn How often do you have to install updates?
W-Am'),
    ('8965575a-335a-4ab9-a6f8-396791db09dd', 'W-Br Let’s talk about your project after lunch.
M-Cn'),
    ('d71b485b-f1c9-4759-92f1-e606704c34ca', 'M-Cn Is there a list of guests who have been invited?
W-Am'),
    ('02b0f440-46bd-47f9-a6af-2540d3306f52', 'M-Au Would it be cheaper to ship by express mail or overnight delivery?
W-Br'),
    ('c730fd69-b09a-4f37-844f-77b9e43f20cb', 'W-Br How do I turn on the air conditioner in this office?
M-Cn'),
    ('9957836d-69b3-4c6a-9fd4-3dc8c5e36731', 'W-Am Have you trained Hikaru to use the new microscope?
W-Br'),
    ('e9475f3b-a9b7-41e1-8c1c-e8cce51e17f3', 'W-Am We’re meeting this week to discuss the upcoming merger.
M-Au'),
    ('04369d98-7066-42ae-a865-1595a067156e', 'M-Au How long will we have to wait for a taxi to arrive?
W-Br'),
    ('528f0660-984a-4622-bd87-f386225170ef', 'W-Br Did the deal to lease the equipment go through?
M-Cn'),
    ('9888f541-68a4-4923-a11b-60c95ec8dbff', 'W-Am Would you like to take this vehicle for a test drive?
M-Cn'),
    ('63391d8b-c509-4bc1-b436-440ba665e1af', 'W-Am: Where are the recycling bins located?
M-Cn:'),
    ('0f5040e1-4f39-4b01-ac08-cc9429a592da', 'M-Cn: Why are you returning this sweater?
W-Am:'),
    ('a4ad15f3-712a-41c2-8cdc-bb0046f220b1', 'W-Br: Do you want me to call a taxi for you?
M-Au:'),
    ('45f27596-4c84-4790-b3f3-f04a55e3ec25', 'M-Au: When will the Dubai trade show take place?
W-Br:'),
    ('cc752487-8471-4cd6-84b7-3e84aff77810', 'W-Am: Who''s going to cover Emiko''s shift this weekend?
M-Cn:'),
    ('b5ada287-329b-4297-89bb-945239696ae7', 'M-Cn: Which kind of sandwich do you want?
W-Am:'),
    ('d5329806-016b-4805-a8e9-522e473f20c6', 'W-Br: You don''t offer boat tours at this time of year, do you?
M-Au:'),
    ('dce7a562-1c5f-4353-affe-c1a14accbf77', 'M-Au: Where''s the new warehouse?
W-Br:'),
    ('a52acb0d-85b7-45f7-85fd-ea7d8ffdcc98', 'W-Am: Who got the promotion to vice president?
M-Cn:'),
    ('763c2ca8-bd5b-467f-becb-cd90afe64755', 'M-Cn: There''s a fitness center in this hotel, right?
W-Am:'),
    ('1ad0a997-0b78-4fb3-a91f-a256d3c7885f', 'W-Br: How did you like the seminar?
M-Au:'),
    ('ffdcf42a-76c8-469d-9bb3-54e3d62f3498', 'M-Au: Does your company let office staff wear headphones?
W-Br:'),
    ('96876c29-72b8-4342-949b-26309fac9ca4', 'W-Am: What''s the name of this dish?
M-Cn:'),
    ('0b6ef124-9ede-45a4-9339-47c280e86954', 'M-Cn: This road leads to the highway, doesn''t it?
W-Am:'),
    ('bbdcd267-d566-4c48-a33c-743be131b063', 'W-Br: Could you show me how to use the packaging machine?
M-Au:'),
    ('c63ba730-0d8d-4648-b2fa-a73fbbce8ae3', 'M-Au: Which notebook do you like better, the gray one or the brown one?
W-Br:'),
    ('cf75f735-d5c8-42ad-b785-065d2cbe4628', 'W-Am: Would printing these handouts in color cost much more?
M-Cn:'),
    ('403d44c4-b6bf-4626-b2f2-0d75a9618af4', 'M-Cn: The air conditioner in the waiting room isn''t working.
W-Am:'),
    ('a11d4ad9-4840-46f6-b523-1f55ca41aafb', 'W-Br: These focus group results are promising.
M-Au:'),
    ('9726f23c-02bc-4187-b471-77324fe194c7', 'M-Au: Let''s get coffee before we go back to the office.
W-Br:'),
    ('491129a1-f905-460e-839b-ba0ae6241839', 'W-Am: Where should I park when I arrive at the venue?
M-Cn:'),
    ('2dffed61-c71f-483f-a05d-099bd094904f', 'M-Cn: When will you begin advertising the conference?
W-Am:'),
    ('c4975fe9-c484-4b1d-a425-5b6a9deff424', 'W-Br: Does anyone have extra tickets for tonight''s charity concert?
M-Au:'),
    ('adad007d-8e72-4d90-b0da-39d198847256', 'M-Au: How much training is required to become a nurse?
W-Br:'),
    ('06bb6e35-73fb-4459-9d13-9177f5739533', 'W-Am: Doesn''t the big conference room have a better projector?
M-Cn:'),
    ('eb44938e-231b-44a4-8916-f962c12c0c9f', 'Will the bank be open over the holiday weekend?'),
    ('89d81f62-e4b1-454b-a74e-d59ac295198e', 'Why did we hire so many people?'),
    ('4a98fe21-a03b-49b9-95d1-19032cae1858', 'You have the presentation slides ready to go, right?'),
    ('2603ed36-a294-4fc9-a550-1ed60fdfc177', 'How long is the flight to London?'),
    ('143b1b12-0143-4a23-8ff7-6b300e72f5eb', 'Who won the employee-of-the-month award in January?'),
    ('ea25303b-464a-4348-8b39-0ba2315e535b', 'Did we get enough volunteers for the music festival?'),
    ('36b7561c-1150-4268-80b5-da3aaa74dea3', 'Will the product be sold locally or nationwide?'),
    ('dd4f66c7-fc99-48cb-b9cd-8189cddd9fbb', 'Would you please put the new ink cartridge into the printer?'),
    ('7fb856b5-7ee5-4a21-8a29-43a84a4d57e6', 'I’ll need to replace the belt on the tractor.'),
    ('fe5a96ba-2b19-4435-9b8f-a83004de40e4', 'How did the project discussion go this morning?'),
    ('dc0a25ef-c86f-417e-8a12-649fa8210f4c', 'Which of these contracts should be renewed this month?'),
    ('353ddc85-cf03-4b87-80b0-4b25dc07670d', 'Did the workers mop the floors again today?'),
    ('b0fc2e94-77de-400d-8c1a-49f9367a1303', 'Make sure you sign up for the seminar next week.'),
    ('a0450a4d-1dbb-4614-910a-3dda3ee30de1', 'Why don’t we pick up some lunch from the cafeteria?'),
    ('d8d8b246-c74f-4ffa-b97a-278559fb20e4', 'Please put in a request for Mona to get access to the database.'),
    ('fba5af44-a468-4f31-a1d5-aec6fb1365d9', 'Call me when your flight arrives so I can come get you.'),
    ('b78bd4ad-9282-484a-a971-ca66e5331dfc', 'Where will the workshop take place?'),
    ('362444a6-42dc-4bbb-803a-98ad8582092f', 'Would you like to be seated indoors or on the patio?'),
    ('df6b063d-b613-42ff-9548-0c3f0c5bc5e5', 'When would you like to see the doctor for your next checkup?'),
    ('6d711cea-3a33-46ca-a62f-7f5cda99a2aa', 'Does Ms. Shimizu usually come to the office on Mondays or Tuesdays?'),
    ('813fc575-e9a6-46a5-a7d9-fc856a7f9ca9', 'Where can I move the file cabinet?'),
    ('0fd64ea6-587e-4fb7-9b53-5bec72ec2c69', 'When will Dr. Gao give her speech?'),
    ('e72c59d3-19d7-4fbf-92e8-0e92b1d77ab5', 'The catering service is calling to ask about the fund-raising dinner.'),
    ('bc66806d-c59d-40c3-b4f9-dd0142f79305', 'Our team will be taking a lunch break soon.'),
    ('d255aa68-eb96-4a0c-8c43-b9dce9d2a0c6', 'Which door should I go through to leave the warehouse?'),
    ('48d90b39-634d-408e-b100-61fe37890171', 'M-Cn: Who brought the extra office supplies?
W-Br:'),
    ('67e1346e-dfef-477f-9d01-a1ed83e2466c', 'M-Au: Do you have a warranty on this laptop?
W-Am:'),
    ('f21ed41e-00f0-4fe8-b267-bc8363af7d02', 'W-Br: Why is the cafeteria closed?
M-Cn:'),
    ('9b457f8a-d137-489e-aa36-eec93483a6f5', 'M-Au: Where do I board the train to Paris?
W-Am:'),
    ('0e47ad5a-673f-47a3-bd75-cb93b141d0c8', 'W-Br: How can we improve our bicycle sales?
M-Au:'),
    ('44c099b3-73db-4c54-a671-ca855815aa44', 'M-Cn: When is the budget request form due?
W-Am:'),
    ('f3e7556d-c530-4f9d-97df-94f540c5e141', 'W-Br: What did you think of the training video?
M-Au:'),
    ('be09aa3c-dcdd-4e44-b3da-3465ba5918ab', 'M-Cn: Do you have a pen I can borrow?
W-Am:'),
    ('26f6ee93-4fcb-469e-9fc7-d2c9e7801ce9', 'M-Au: Did the Human Resources meeting get canceled?
W-Am:'),
    ('0d9ff6a7-8e05-400a-a7cd-7ee7b25e142d', 'W-Br: That position''s been open a long time.
M-Cn:'),
    ('b54b4478-5a4a-4f9a-a3bd-e908d4bd8e26', 'W-Am: Would you like to try a free bread sample?
W-Br:'),
    ('a2196aa0-ce11-4061-84b0-444ac360aff8', 'M-Cn: When will the car be fixed?
M-Au:'),
    ('5e404781-04d1-4912-a3c8-7049921b4f77', 'W-Br: This painter''s work was featured at the Holtz Gallery, right?
M-Au:'),
    ('a1d3a169-5852-4eed-94b0-cf5c680ab667', 'M-Cn: Could you attend the technology trade show?
M-Au:'),
    ('ff3cfffc-afba-4ca7-b84b-ae074b9f21d1', 'W-Am: When can we get together to start planning the awards banquet?
W-Br:'),
    ('cc32248b-9e34-45f7-aab4-78e256584dd9', 'W-Am: There are a lot of customers here at the store today, aren''t there?
M-Cn:'),
    ('f0bd50da-b9a4-453f-8b2f-c2fa48b1b223', 'M-Au: Will the musicians be set up by five o''clock, or are they arriving later?
M-Cn:'),
    ('62eb0c02-8788-4841-9250-faf7f9c8c9c9', 'W-Br: What do we need to bring to the workplace-safety orientation?
M-Au:'),
    ('1b654eb3-aaad-4b02-84e2-4bc0ebc5df07', 'W-Am: How did you like last week''s seminar?
W-Br:'),
    ('412227c6-d1b5-4e2c-bc22-3ae764603da2', 'M-Cn: Didn''t Mr. Jacobs ask us to call him before the staff meeting starts?
W-Br:'),
    ('3059554f-2790-4227-ad2c-4a318ccb8648', 'M-Au: Which brands of computers do you sell at your shop?
M-Cn:'),
    ('5bb9c488-6b00-41cf-ab25-17cb8ec3bd72', 'W-Am: Why don''t you print out the slides so we can review them?
M-Au:'),
    ('31b7ba0b-6f82-481a-8dd2-5f0320845d25', 'M-Cn: Do you want to hold the reception in the conference center?
W-Br:'),
    ('c65bd5da-f4c1-44f2-b602-7b74587e33ba', 'M-Au: I don''t think we''ve budgeted enough for the construction project.
W-Br:'),
    ('fe8102f5-5e95-47bc-86e6-f7060ff629c9', 'M-Cn: If the parking area''s full, where can I leave my car?
W-Am:'),
    ('499d3cfd-52d0-4cf5-ac65-d98829e0faa4', 'M-Cn: When did you last restart your computer?
W-Am:'),
    ('cba38e51-b064-4ed9-9ca3-b490a8e8911a', 'W-Br: Who set up the display of leather jackets?
M-Au:'),
    ('e632b5b4-9cad-4550-9b3b-c3a5011c29ba', 'W-Am: Which curtains would be better for the lobby?
M-Cn:'),
    ('2f2bea9b-5940-4dff-8fd6-479a80cd7568', 'M-Au: Would you like another cup of coffee?
W-Br:'),
    ('957ce98a-630e-4b07-beaf-2f668ef02d7c', 'M-Cn: Have you received the new work uniforms?
W-Am:'),
    ('abd8971f-f4f3-4d9e-af07-b205632f19ec', 'W-Br: How will the applicants'' résumés be screened?
M-Cn:'),
    ('c981d8b2-f2fe-4f04-ae76-ec79ea293f90', 'W-Am: When should I expect the new sofa to arrive?
M-Au:'),
    ('53dc806b-074a-44c1-bae8-78843bd58593', 'M-Cn: Why don''t you join us for dinner on Friday?
W-Am:'),
    ('591ee1cc-c56f-4eb4-8e79-b5f8b4582024', 'M-Au: Tickets for the comedy show have been selling really well.
W-Br:'),
    ('9cbd4c97-1af4-47f4-97b6-69c3e4972640', 'W-Am: Have you found a suitable venue for our awards banquet?
M-Au:'),
    ('a9209cd4-cd9e-4fd6-ac0f-f5887d6c8b2e', 'M-Cn: Nicholas plans to work overtime today, doesn''t he?
W-Br:'),
    ('e871f1a8-1e9e-4438-94f2-79faecfa2840', 'W-Am: Where can I find the lunch specials?
M-Cn:'),
    ('914914d1-086a-4363-ae0b-ace6375802e0', 'M-Au: What airline will you fly to the trade fair?
W-Br:'),
    ('51faa9f4-e119-4e3b-bee8-1d1cb64fcce8', 'M-Cn: Didn''t we repair this heater last week?
W-Am:'),
    ('4ffbf4ef-ccea-4cd2-894a-d5247839fce6', 'W-Br: When am I meeting with the bank about our loan application?
M-Au:'),
    ('dec1507a-f21b-4cd2-bbdb-d3e094ff9349', 'M-Au: I was surprised by Mr. Seger''s announcement about retiring.
W-Br:'),
    ('9d612b27-7529-42c3-b71a-b009142b76ed', 'W-Am: Why were extra staff called to the factory?
M-Cn:'),
    ('3a1e307b-0118-460c-b211-23a072dd9206', 'W-Br: Has the theme for the photography contest been decided?
W-Am:'),
    ('bb14473c-f2ba-4a43-a11b-f9a29d4c88b5', 'M-Cn: Let''s hold the event on the patio instead of in the dining hall.
M-Au:'),
    ('eee82431-2550-4f06-b37f-f031a030696a', 'W-Br: How long does it take to complete this survey?
M-Cn:'),
    ('12956235-e519-4663-990a-3a761f7f91ce', 'W-Br: We should leave these boxes in the hallway.
M-Au:'),
    ('118f05b8-ca3e-43a0-ac32-cba7fcd03376', 'M-Au: We can park here overnight, can''t we?
W-Br:'),
    ('719267e6-b043-485c-aeef-a830aa6cd47a', 'W-Am: Can employees bring their families to the picnic, or is that not allowed?
M-Cn:'),
    ('7fc0b607-2c91-4aba-b928-b3cf5663280a', 'M-Au: Where did you live when you first moved to Boston?
M-Au:'),
    ('cdc833c8-3345-4965-a130-aa2da39d439a', 'M-Cn: Have you received the memo about the new layout for the Web site?
W-Am:');

INSERT INTO migration_part2_question_text_20260811 (question_id, question_text) VALUES
    ('db7ee7c8-0cfd-4463-b674-0e2dcf5347a2', 'M-Au: Who''s the new accountant?
W-Br:'),
    ('a28a5985-b41e-471b-850b-c6e86ab20c16', 'M-Au: Did you find musicians for the charity concert yet?
M-Cn:'),
    ('fc63ad07-2364-43f6-9621-b362e52624c9', 'W-Am: What still needs to be done before the grand opening?
W-Br:'),
    ('c8b53b7f-bc81-4f8c-a266-9e07fc3180a8', 'M-Cn: Where is the picnic being held this year?
W-Br:'),
    ('10b7ba2b-6933-4cdb-8c27-537eb0473c93', 'M-Au: Do you want to walk in the park or at the indoor track?
W-Am:'),
    ('51c807aa-4c54-49df-8fd1-f572831654a2', 'M-Au: The report says our sales for this quarter are low.
M-Cn:'),
    ('cdc26f81-d982-444c-be08-ee15420a290c', 'M-Au: When are you going to submit the monthly report?
W-Br:'),
    ('a434a5e0-f771-4477-b1bc-6c9bc9314ab2', 'W-Br: Would you care to try a sample of our new fruit juice?
M-Cn:'),
    ('3d333bd4-284f-4fa6-b699-a0b5cd8e529e', 'W-Br: Could you revise this budget?
M-Au:'),
    ('dfaccf5c-1a2f-40d3-9ad2-9bc5690b2c81', 'W-Am: This stapler is Fernando''s, isn''t it?
W-Br:'),
    ('10bb91ed-e8bf-4fe9-a93b-2110a0800c00', 'M-Au: Should we ask the waiter to bring us some water?
W-Am:'),
    ('dff01424-3b8c-4c29-8ada-cd75f2e507ac', 'W-Br: Why did you rearrange the tables in the boardroom?
M-Au:'),
    ('587d24c3-237d-4ec3-8045-5f3261c82695', 'M-Cn: Excuse me, do you have this shirt in red?
W-Am:'),
    ('060e27f8-bd57-4325-9860-d4743db67218', 'M-Cn: What did you think of Ms. Delgado''s job application?
W-Br:'),
    ('6220993d-ff17-44a2-876c-f38c5ee3f1df', 'M-Au: How far along are you on the quarterly report?
W-Am:'),
    ('4bc9c3fb-07a8-44da-af96-32f89058447b', 'W-Am: Don''t we have enough supplies to finish painting the house?
M-Cn:'),
    ('d4dcfccc-484d-41b7-b7fb-f5526f4f44b6', 'M-Cn: You already booked your flight, didn''t you?
M-Au:'),
    ('e532cdee-7ad0-4631-a87c-7275712efa0c', 'W-Am: Where can I find the first-aid kit?
W-Br:'),
    ('f5796f19-a093-47a0-88dd-70ab6acbbb0a', 'M-Cn: Don''t we have to review Joshua''s presentation?
M-Au:'),
    ('205e4072-3434-4738-a83a-e1e78b6b7115', 'M-Cn: Do you want Mike or Hyun-Jung to be at the product launch tomorrow?
W-Am:'),
    ('64f62430-3a70-447a-b6c5-c15df1b751ac', 'W-Br: How do you change your password on the new system?
M-Cn:'),
    ('95d80229-b5a7-4c53-bdaf-24eaf2e6e159', 'M-Au: Who was the keynote speaker at today''s conference?
W-Br:'),
    ('508f6082-b259-47f1-a1aa-ae2534d650d3', 'M-Cn: Didn''t we select an image for the newsletter already?
W-Br:'),
    ('6b315e59-8a16-474c-82ea-fc040138fe03', 'M-Au: I don''t know how to download mobile phone applications.
W-Am:'),
    ('503c11e0-ef50-4009-86e4-6c6a51192bf0', 'W-Br: Are you going to the lawyer''s office for a meeting, or for something else?
M-Cn:'),
    ('d5595871-3d54-4edb-a049-a6ffa92603fc', 'W-Am: When are applications for the summer internship due?
M-Cn:'),
    ('0cff1834-1e26-4c52-8821-a144e0f1e99e', 'M-Au: What ingredients are in this cake?
W-Am:'),
    ('f408a5c5-6298-41aa-b50f-8201faabf435', 'W-Br: Who''s in charge of training the new salespeople?
M-Cn:'),
    ('ee318ff1-c1ba-41e7-b930-85b77ed3a060', 'W-Am: What time is our flight to Hamburg?
M-Au:'),
    ('ea945dbb-cc96-4756-8942-feaf2aa0cddf', 'W-Br: Our new employees have been doing a great job.
M-Cn:'),
    ('aa4321af-73e7-43c1-985f-6ae07f00bfc9', 'M-Cn: Should we drive or take the train to the meeting?
W-Br:'),
    ('6795ff68-7b30-41ab-aaf1-a636edc5b14b', 'M-Cn: The food at the Fairmont Café is delicious, isn''t it?
M-Au:'),
    ('3e1b0998-1afb-4346-b6a3-06b07a38a21e', 'W-Br: How long will it take to fix the air conditioner?
M-Cn:'),
    ('72c33237-686d-433c-ba35-18eb73040e91', 'M-Au: We''ve seen a big increase in sales over the last month.
W-Br:'),
    ('db1b87cd-cdd8-451a-94b2-9797e7e8019e', 'W-Br: Shouldn''t we move the desk closer to the window?
M-Au:'),
    ('f34e8097-7b61-471f-90a0-67da45a4af31', 'M-Cn: Why can''t I access the reports folder anymore?
W-Br:'),
    ('4f328477-2a32-49da-8cd6-85e812835f36', 'M-Au: Would you like to schedule an appointment for next week?
W-Br:'),
    ('e8816a68-4141-4887-a459-e9d2d0412d7e', 'M-Cn: Why haven''t the budget adjustments been made yet?
W-Br:'),
    ('57518f86-96c2-415c-8ade-d330e7c03280', 'M-Cn: I think you should choose the black and white desk chairs.
M-Au:'),
    ('b8de0447-718a-42e1-853f-875e49d9a70d', 'W-Br: You''re going to attend tomorrow''s training session, right?
M-Cn:'),
    ('8dcb856e-0a60-45aa-b9a2-565b71949f53', 'W-Am: Should I reserve the meeting room for one hour or two?
W-Br:'),
    ('4982ac36-534d-4baf-b816-b681ab568aad', 'M-Cn: Does this factory use any recycled materials?
W-Am:'),
    ('012c4be9-0e0a-4af7-b7d9-2932afaf3b34', 'M-Au: Who''s leading today''s tour group?
W-Am:'),
    ('7088c2a0-1f95-454a-8102-04878752e935', 'W-Br: Can you tell me the name of that band we liked at the music festival?
M-Cn:'),
    ('ec5bf7ac-aeff-4d9d-b83a-79db5660ab10', 'W-Am: When will you be available to start the position?
M-Cn:'),
    ('a76f1276-59d9-42b4-90a9-3e8ea438d159', 'M-Au: Isn''t tomorrow''s seminar about time management?
W-Am:'),
    ('f7e032ab-cf5a-4918-9091-ccec02198fd7', 'M-Cn: Why is it so hot in this room?
M-Au:'),
    ('71d545d2-b606-48a8-876f-afb8d1c13061', 'W-Am: Where''s the main entrance to the museum?
M-Cn:'),
    ('7a955eca-7788-4852-9d21-ed3eefe0b59a', 'W-Br: How can we cut office expenses?
M-Au:'),
    ('647deccd-3158-447d-bc1e-8212d322ee63', 'W-Am: Have we ordered more of the lavender soap yet?
M-Cn:'),
    ('b7486235-4e28-4a9a-ab51-b40647912da2', 'M-Cn	Where is the closest coffee shop?
W-Br'),
    ('c14851c8-b1ca-44d9-9391-c952002331ad', 'M-Cn	Would you like a morning or an afternoon appointment?
W-Am'),
    ('d9c828fe-8678-446d-8866-97d57ad53580', 'W-Br	Are you having trouble with your Internet connection, too?
M-Cn'),
    ('54c04e47-620b-4c74-bed1-3dbc00f9b138', 'W-Am	Who''s that sitting in the lobby?
M-Au'),
    ('4ea1b73f-de67-437f-8156-2cbf71a254ed', 'M-Au	What did Simone say about the project proposal?
M-Cn'),
    ('62ba52f3-22a0-4b94-8f43-226a48e72b76', 'M-Au	Would you like a free ticket to tonight''s play?
W-Br'),
    ('6a0a1522-d2d2-4e0b-a3a7-2c8f735d8c2c', 'W-Am	Isn''t that new restaurant supposed to open soon?
M-Cn'),
    ('d2b221a0-da8f-4f15-ab98-c2ebeeeb0f07', 'M-Cn	Why is the flight delayed?
W-Am'),
    ('c8f36685-b027-43e9-91c1-d5435c99ed08', 'M-Au	Who''s organizing the bowling league?
W-Br'),
    ('b8a76d94-74af-4ad9-bf71-11826833ae63', 'W-Br	Did you submit the expense reports?
M-Au'),
    ('f6dc1f0a-8e8a-449e-a730-2d2e833e308a', 'W-Br	Aren''t we all getting new business cards?
M-Cn'),
    ('74d70661-653c-4391-80fe-e4efa4c5ecef', 'W-Am	How many people did you interview?
M-Cn'),
    ('582676e1-8fbc-4c0a-b69d-0b08dee4a07e', 'W-Br	Sales of our strawberry ice cream rose by ten percent last month.
M-Cn'),
    ('c8062a56-81ec-414c-87c9-dbb24ca6855d', 'W-Am	Can you help me log on to my computer?
M-Au'),
    ('a1680364-d0ef-4472-bff3-d36a17239ac6', 'M-Au	What time do you think we''ll leave the zoo?
W-Br'),
    ('93475c0b-8271-4ce7-85f2-81608db9c546', 'M-Au	The artist has signed the paintings, hasn''t she?
W-Br'),
    ('6bba2440-4422-4766-87a6-5a142d64d7a7', 'W-Am	How do you like traveling by train?
M-Cn'),
    ('e585acdf-9f5d-4532-be23-78e55f3512bd', 'M-Au	Would you take charge of planning Pablo''s retirement party?
W-Am'),
    ('8b0944b7-0192-4af6-a33f-2ad2e29ebb04', 'M-Au	You hired the new assistant director, didn''t you?
W-Br'),
    ('19d6bcd0-76dc-43e3-81b8-cc48358e6db5', 'W-Am	Should we put the advertisement on the first page or the last page?
M-Cn'),
    ('fe45fa00-6bbf-4767-841f-f8662a700d54', 'W-Am	I''ve finished the building inspection.
W-Br'),
    ('f0ea81c4-c9f3-4d97-afd1-c2a9b521637a', 'M-Au	When is Pierre scheduled to pick up the steel pipe?
M-Cn'),
    ('b53bc350-eb50-4cdb-b04c-eee561437166', 'W-Am	Why am I not authorized to download this software?
M-Cn'),
    ('1fdd2386-d0a0-4047-9baa-8f9cccc3e42e', 'W-Br	Where do you park when you drive to Dr. Li''s office?
W-Am'),
    ('629b7a1c-1923-41d2-806a-aa6c5606ea45', 'M-Cn	Aren''t we getting a digital sound system?
W-Br'),
    ('314ec40c-4ee0-49d9-8b3b-39af620cdfae', 'M-Cn: When does your flight leave?
W-Br:'),
    ('4a30d4c1-8419-4ef2-b0ab-c81f79fb18cc', 'M-Cn: How much do you charge for carpet cleaning?
M-Au:'),
    ('11e4da09-e980-4d93-b418-fd944ac8fc21', 'M-Au: Do you want to try those shoes on?
W-Br:'),
    ('032887c0-6792-45e9-84f7-c21fed669745', 'W-Br: Who can I talk to about home financing?
W-Am:'),
    ('c393dc47-ca54-41eb-a6a8-9c17837aa2f2', 'M-Au: What should I do with these bottles of water?
M-Cn:'),
    ('85b59e51-3b05-40a1-832a-e4eb1646cf6e', 'W-Am: How was the basketball game?
M-Au:'),
    ('ed96b915-f939-4c9f-81e3-0a3ea4fafdaa', 'M-Au: The conference runs through Sunday, doesn''t it?
W-Am:'),
    ('68fdaa3b-b9b1-4d5a-b628-314c36990301', 'W-Am: Why is the elevator blocked off?
M-Cn:'),
    ('852a21ba-74b0-4981-945b-57739265dc9a', 'W-Am: Where can I buy a pair of wireless headphones?
M-Cn:'),
    ('b7c51d7c-beb1-4679-b11a-58c90a5e6288', 'W-Am: I can just submit my expense report next week, right?
M-Au:'),
    ('c2f83ff1-c3ca-47e2-ac05-11a49b108cc0', 'M-Au: Are you looking for a part-time or full-time position?
W-Br:'),
    ('321a0036-314d-4f2d-9f07-74a8f23bd5dd', 'M-Au: Can you help me change my log-on password?
W-Br:'),
    ('f047ff13-598f-45b2-96c3-94ff2752cc71', 'W-Am: Why are we being required to use new scheduling software?
M-Cn:'),
    ('2ad5b17d-4881-41d4-babe-14f37a9ff177', 'M-Au: Which brand makes the best washing machines?
M-Cn:'),
    ('0bbcad2b-40e9-4fc8-83ad-155a155e47db', 'M-Au: Don''t you have any apartments available in the next month?
W-Am:'),
    ('78653068-3c1f-42c8-aeef-6e3d0ae8f655', 'M-Cn: I left my umbrella in the taxi!
W-Br:'),
    ('2d93b116-c8ef-488c-9c10-953a8c6cbea6', 'W-Am: When can we expect the contest winners to be announced?
M-Au:'),
    ('c05cf5d6-044e-4204-b25e-2245f072ee9b', 'W-Br: Where do we put old ink cartridges?
M-Cn:'),
    ('188f8da5-8b78-49a9-86a5-05b918303e48', 'W-Am: We should consider replacing our packaging machine.
M-Au:'),
    ('837fd16b-acb5-48a5-831a-14b1e4dc35dc', 'W-Am: Will my account be suspended if I use my credit card abroad?
M-Cn:'),
    ('6c38ab98-4f6a-45cd-9e84-b697bf246aa1', 'M-Cn: Aren''t you going to attend the database training?
M-Au:'),
    ('b61f2792-823f-450b-a6f8-644880e3bf5f', 'W-Am: Can you send me the budget proposal for the relocation?
M-Au:'),
    ('518539e4-965b-4a2e-a622-9beeaaf2988a', 'M-Cn: Do you want to hold the focus group meetings this week or next week?
W-Am:'),
    ('752c6f07-7b3b-4216-9afe-25f3353077b8', 'W-Br: Who was the graphic designer for the event T-shirts?
M-Cn:'),
    ('9e33cb34-0bee-4c37-90c6-a57736a74b73', 'W-Am: It''s a long drive to the convention center from here.
M-Au:'),
    ('d82821a1-d0ed-4970-b5e2-ce8609eeef7b', 'M-Cn: Do you think it''ll rain tomorrow?
W-Am:'),
    ('813f5c96-7b3c-4e2e-9f6d-f96f6d731e48', 'W-Br: When will the new building be finished?
M-Au:'),
    ('86e8d5b2-e463-4009-9095-0f7f593d8e6d', 'W-Am: How was the fund-raising event yesterday?
M-Cn:'),
    ('36785e2a-9c7b-4d43-b16d-08c6092d2806', 'M-Au: Where is a good place for a quick lunch?
W-Br:'),
    ('19ebeebb-b93d-4ab7-aee5-9d7ba4533859', 'M-Cn: Don''t you work upstairs?
W-Am:'),
    ('b0f3b301-3ab7-4d60-b511-6156c792dd41', 'W-Br: You submitted the travel request, didn''t you?
M-Cn:'),
    ('4c43ec4b-8752-4aa2-b3ae-22ded2b8cd0f', 'W-Am: Who''s going to take notes at Thursday''s meeting?
M-Au:'),
    ('6b062593-d9a7-4dcb-a38a-b96b5bc2f63b', 'M-Cn: Why can''t we replace the computers?
W-Am:'),
    ('4b283e6c-74f2-4fcb-9bcd-d35cbb6b73ce', 'M-Au: Shouldn''t we update our company logo?
W-Br:'),
    ('83fc23ae-b216-4c26-9695-0a4521cd17e6', 'W-Am: When are they going to hire someone to fill the open position?
M-Au:'),
    ('17451286-6fda-4af5-9a55-ffe9473d4735', 'M-Cn: I heard Fatima is presenting her proposal today.
W-Br:'),
    ('383e344a-cc84-49f7-a716-b35de4c1c592', 'W-Am: Why don''t we invite Ms. Li to the business dinner?
M-Cn:'),
    ('93f4d9bf-5f45-49cc-94c1-8bf3dc7a99db', 'M-Au: What repair work needs to be done on this car?
W-Br:'),
    ('7fc4b34a-2b56-4d69-9d2b-4a6a426d1af5', 'M-Cn: Who should I call to set up my printer?
W-Am:'),
    ('cf802d18-9069-4b29-87b6-c6498d5f6d38', 'W-Br: Have you ordered more whiteboards for the office yet?
M-Au:'),
    ('02384882-f280-4da2-9268-fe6107bae8e6', 'M-Au: There''s a special exhibition at the art gallery.
W-Br:'),
    ('a3b0d99f-a42f-48b4-8443-922ae48e287c', 'W-Am: Can I start the videoconference now?
M-Cn:'),
    ('765bcd01-50fe-49c7-b2fc-de8649d04d85', 'W-Br: Who authorized that purchase?
W-Am:'),
    ('c69da20b-3735-4bc6-9a45-1025b9e7f9c9', 'M-Cn: Why is the library so busy today?
M-Au:'),
    ('f44d1299-758e-47f2-abed-82d0987c00db', 'W-Br: We should really buy a new coffee maker.
M-Cn:'),
    ('dfa43bd5-089d-401c-97d4-1120110bc1a6', 'W-Br: I''m afraid I won''t be able to lead the tour this afternoon.
M-Au:'),
    ('bcc939c8-87e4-4085-94d3-52e3ff616808', 'M-Au: We still need to sign our contract with the advertising agency, don''t we?
W-Br:'),
    ('34a34b6b-c3c2-4bf7-a7ba-72d9a34b8479', 'W-Am: Should I bring some photography samples to the job interview?
M-Cn:'),
    ('dee621fc-430c-4c39-abba-4206231b6628', 'M-Au: Is there a room in the store where I can try this shirt on?
W-Br:'),
    ('da5ca6a3-aa4b-4ce7-93e7-cd4c60330a68', 'M-Cn: Would you like to meet on Tuesday or Wednesday?
W-Am:'),
    ('cae05213-da72-462d-9432-0a9e96b1a115', 'Will you let me know when the catering order arrives?'),
    ('f47162ab-e109-4c11-b442-6c8b300edb30', 'Why is the manager being replaced?'),
    ('4426468d-5b01-418b-8bac-49bfd4a57bf5', 'Ms. Cho should close the store early on Friday.'),
    ('8885e106-632e-436e-97d4-be8e6cdd35bf', 'Why did you decide to become a pilot?'),
    ('d9f2d92b-0ef0-4d35-bfd6-fcf6ab957f22', 'Have you always commuted by train?'),
    ('5ac994c4-aa38-40b8-a642-b30f50d2733f', 'When does your manager usually come in?'),
    ('b36e311e-e7bd-4c51-8ab7-70073a8bff1e', 'Isn''t there a discount on this computer monitor?'),
    ('2041ae72-34ea-47ad-b300-933127b95b05', 'How is the new group of interns doing?'),
    ('87ead579-048f-4381-a4d0-88a23b604c8f', 'They''re carrying those boxes to the storage room.'),
    ('fb4311d4-9109-4296-906b-b216c49abb75', 'Where can I send the money?'),
    ('14d9a5c3-8afc-45be-8715-6964ea722d36', 'Who''s coming in tomorrow to help us prepare for the grand opening?'),
    ('67663119-a75f-4e87-a854-b604862c228f', 'How often does the bus stop at this location?'),
    ('1a404bf1-550b-48aa-80c0-30ba76dd4cf9', 'What''s the candidate review process?'),
    ('a9ba419b-1145-48ac-8164-ed75380f5abe', 'There''s coffee in the break room, right?'),
    ('b4475551-83c8-4cc4-9078-0dc53b66348a', 'Who''s going to the company picnic today?'),
    ('5e492f14-7a66-46aa-80ea-7e9e6e459792', 'Will the bakery be open tomorrow?'),
    ('98a91edb-bac0-4a3a-a63d-1413ffe51c23', 'Are you installing the new software on Monday or Tuesday?'),
    ('58e964ce-bce8-487e-8119-83b2176d06dd', 'Let me find a sales associate to help you.'),
    ('42f01d4e-af13-4308-b8cb-3b559f3115aa', 'You''re offering discounts to students, right?'),
    ('1b7f771f-6d7c-4548-93fe-a63a3cf1d92c', 'The sales department posted an advertisement for an assistant.'),
    ('a1f32425-5da8-4fe5-a737-8f5e06d7a4f1', 'Does the new accounting software work well?'),
    ('5cc6571e-216b-4591-9088-70f63f09d6e2', 'When''s the finance department going to confirm our first-quarter budget?'),
    ('f62ceb42-cb0e-465f-a903-49799b390fb8', 'Who canceled the conference call?'),
    ('09961512-fef1-45af-a2d6-0659650f2208', 'Can you please transfer the service to my new phone?'),
    ('0db81ec4-7324-4fa7-9a63-d906b948af69', 'How was today''s manufacturing seminar?'),
    ('966b2cd3-1e5a-4669-acb7-b5e374d022eb', 'Would you like me to check the price on that item?'),
    ('54222e47-b642-467c-b78b-da09dc5b55a1', 'Shouldn''t we have submitted the expense report by now?'),
    ('131fb4a0-07b4-49d6-b055-c7b542d5ee0c', 'How can we resolve the problem with our client?'),
    ('bf343940-b24e-47cd-8e5b-cfe66900e758', 'Was the restaurant really expensive?'),
    ('6d11e567-e0e6-4c8a-8357-5253139db700', 'When will the dishwasher prototype be ready?'),
    ('ead81a15-aa8c-4ffb-85ae-ef5aad98a573', 'Let''s cancel our appointment.'),
    ('2eebd692-9c1a-47e6-b13c-784f14783fbb', 'It''s OK if we don''t check these receipts until later.'),
    ('4b956d6a-1868-43a7-9cca-0a7bff4365bb', 'Where can I find the shipping address?'),
    ('abe361ae-ac22-46bf-bbc6-8a5d1d911dce', 'Which bus stop is closest to the apartment building?'),
    ('5c3741f6-3a94-4389-8da9-3f5160c50416', 'Who''s the main performer at the music festival next weekend?'),
    ('120e45d4-c233-4013-8b6b-14875e292bef', 'When are we meeting again?'),
    ('e4e8fbbe-001a-424d-b0b6-6ab93545a17d', 'That project''s been approved, right?'),
    ('98fa735b-8391-42ab-a950-43fdae73fab1', 'Did you put the brochures in the lobby?'),
    ('0103792b-8afe-439f-9181-35443a5c2045', 'How soon will we be able to replace the furniture in the waiting room?'),
    ('cc82fe95-0b24-4960-82ed-2b63ec203592', 'Who is the keynote speaker on Friday?'),
    ('fbf02838-d8d1-431d-a842-bb6f4411911b', 'When should we order the gift baskets?'),
    ('96d6b3d0-b088-4690-91d4-ac3c8da761d3', 'Why was the seminar agenda changed?'),
    ('3fff1b8c-b32d-496f-ae66-dafce2c1a2ce', 'Are you taking the bus or a taxi to the client''s office?'),
    ('bb0bc141-a2e7-4901-aaca-9e4f7b72bd0d', 'Could you help me set up these chairs for the picnic?'),
    ('c725b8d9-f151-46d2-9e75-a17f545157d3', 'Who''ll be selected to work on the prototype?'),
    ('e106afce-d8d5-4012-8a0d-d92eb46beb48', 'Ms. Lambert is responsible for the payroll.'),
    ('9f4747a4-97b8-4140-ab74-108119008fa1', 'Can''t we extend the advertising campaign?'),
    ('aa88d70d-4221-47bc-92eb-8c51e928b881', 'Please close the door so that the presentation can start.'),
    ('24e65f5e-8a17-4697-a156-41ac8bc3af47', 'How often have our packages been damaged during delivery?'),
    ('08099062-403c-43ce-8cf9-d9660b017a5f', 'They''re bringing a piano into the café, aren''t they?'),
    ('e3f613c2-5e6b-4e94-971c-f470109ca168', 'Where do I sign this contract?'),
    ('c80053b4-f7c5-479a-a888-438f42255cde', 'How about planting a vegetable garden?'),
    ('c0d94355-7e30-4938-af0a-4cef2b693f7b', 'When did the conference committee meeting get canceled?'),
    ('3a7d53ac-bb5e-4824-9c98-4d5d73806441', 'Does the company pay for our hotel rooms?'),
    ('6f7557e3-5db7-4c10-92a6-c7b599108d20', 'Our team''s going to inspect the construction site tomorrow.'),
    ('466f848e-3191-4d7a-96e3-0eb85d362147', 'Why does the Moon look so close in this photograph?'),
    ('5c34ae2b-8f0a-4b9d-8e04-73778a4a8e02', 'How do I log on to this computer?'),
    ('507a9397-54fb-488c-ae29-652d616d6bab', 'When does the property manager arrive?'),
    ('4c25cb9d-8f60-4fba-a36d-cbe5aaed848c', 'Let''s have dinner at the French restaurant tonight.'),
    ('fbba4402-b5a3-420e-b918-9ce7b44af4f3', 'Who''s supervising the production line?'),
    ('e5e6aefd-cedc-488a-83bb-6559bc3dda51', 'When will the reception for the artists start?'),
    ('793c2756-c27f-4938-ab20-2fca155f2751', 'How often should I submit my travel expenses?'),
    ('e302d814-93b9-4cfb-a944-c8e0c94b50d7', 'Our print shop is going to have a sale on shirts.'),
    ('7d38abb3-795f-43bb-89fe-a65b9d9c9231', 'You already bought a new part for the sprinkler system, right?'),
    ('3c2dfebd-5b25-481e-9af2-4678d61e44aa', 'How many lamps are made at the factory every day?'),
    ('b7d8a271-7960-4024-8387-e991614e21c4', 'Are you going out to eat, or did you bring your lunch from home?'),
    ('0c3093ca-a335-4179-83b6-d2cd04d526f1', 'Can I place an order online?'),
    ('60b1b5cb-6729-45fa-b001-bfa31cf8e713', 'Shouldn''t the new floor plan be finished today?'),
    ('45677219-9925-4c61-9b70-8203ff62ae85', 'Who''s the new head of the legal department?'),
    ('d824d8f7-cf8b-4dd5-8219-834af97c10b7', 'Who''s scheduled to repair the water heater in building two?'),
    ('447626df-2479-43e6-afff-934f6b14064b', 'Why were the sales figures so high last quarter?'),
    ('b81d0a6f-c487-444a-a871-85ca4e23bb48', 'Ms. Martin is demonstrating the new software at the conference.'),
    ('5077b319-0fbc-4613-a815-9b8eb5c162c4', 'Let''s hire Johnson Construction to fix this roof.'),
    ('1359c949-88ba-4d32-9d80-0257e93d69ed', 'Your travel itinerary says you''re going to Seattle, right?'),
    ('89f66e9d-27fc-4331-bffc-b7b79b5404c3', 'Won''t theater tickets become available later today?'),
    ('080ce8aa-106b-48dd-98b8-e808cea46341', 'W-Br: There’s a meeting in the conference room soon, right?
M-Au:'),
    ('54a98734-9bfe-47e1-a252-c1833139e936', 'M-Au: Why hasn’t the mural in the lobby been painted yet?
M-Cn:'),
    ('6f1bcd01-9fe9-4c08-a00c-0b25e4646452', 'M-Cn: Do you prefer writing in the morning or the afternoon?
W-Br:'),
    ('fa8b8ad3-43b9-48cc-a6c1-f9654b4a4212', 'W-Am: I suggest we paint the waiting room light blue.
M-Cn:'),
    ('8d15d5d8-8184-4f3c-b419-e9238d4c548a', 'M-Au: Did you know that the music school is closed on Sundays?
W-Br:'),
    ('d66fe1dc-b42f-4ad7-8145-30ab22a9fbec', 'W-Am: How do I find the office manager?
M-Cn:'),
    ('ec958d63-beb7-44dd-af37-54e94e911f85', 'M-Au: When did you place the order for the lumber?
W-Br:'),
    ('a8a9b6c1-5486-46ab-b860-474d57142fdc', 'M-Cn: Where is the new packaging machine?
W-Br:'),
    ('3ab3f4f8-55eb-44c5-9e36-127e4e79689a', 'W-Br I''ll be out of the office this afternoon.
M-Au'),
    ('8896082d-2ed5-4c69-9c2c-53296f03c1c3', 'W-Am Are you taking a vacation once this project is over?
M-Au'),
    ('5251906d-c419-449f-9970-a123c18235ae', 'M-Au Let’s post the sales report to our team’s Web page.
w-Am'),
    ('a14364ca-9af9-45b3-b0d2-d2f462f9efa9', 'M-Au Which airline are you planning on using?
W-Br'),
    ('7ea1e8fd-2219-47b1-bd78-cadd92c907fc', 'M-Cn Where’s this shipment of parts being sent?
w-Br'),
    ('6fe04e8e-1eb9-43aa-9da4-ecfaec3cd7fd', 'W-Br Who paid for lunch?
M-Cn'),
    ('04c7e2b5-32c4-4d26-95b1-66b444d843db', 'M-Cn How many employees work in your department?
w-Am'),
    ('2dc3e1e8-be9c-441a-bd77-ae2d6703a3d4', 'M-Cn We should leave for our training course soon, shouldn’t we?
W-Br'),
    ('1c449e75-2635-4c42-bea1-c172926c7731', 'W-Am Isn’t there a limit on travel expenses?
M-Au'),
    ('920e8e45-24db-45ac-9678-881bc52cdf9b', 'M-Cn When should I tell the director that I’m interested in the management position?
W-Br'),
    ('ec4b1925-0237-4594-b116-5bcc8ec5cefd', 'W-Am The layout of the footwear department has changed.
M-Au'),
    ('e6fa83e5-9645-4515-b45e-e3002a0ce9b0', 'W-Br Can you look at this month’s revenue report?
M-Cn'),
    ('af91c8c2-e05d-461c-899f-f81b539003df', 'W-Am Why haven’t the windows been replaced yet?
M-Au'),
    ('7366550f-548e-48de-8f64-4f319ad838e3', 'M: Isn’t your suitcase going to be heavier than the permitted weight?
W:'),
    ('2b985b25-cf3d-4dee-be6b-baf0b10da836', 'M-Cn Who manufactures the engines for our machines?
W-Am'),
    ('5155bbfd-5450-4881-bc55-871157d7473e', 'W-Br Should we meet at the department store on Fifth Street or the one on Grover Lane?
M-Cn'),
    ('c89d00f5-87f6-4b54-be92-cca0a151fc6b', 'W-Am Which band is playing at the club tonight?
M-Au'),
    ('06c1c61d-c1c8-49c4-be23-bc6e8bfaea87', 'W-Am: Why is this restaurant so popular?
M-Au:'),
    ('545b2739-5a26-4bfe-9171-bd819e395083', 'M-Cn: When does the park close?
W-Br:'),
    ('bee46bc4-d3c2-4187-baa0-f4cdce0d21de', 'M-Au: Which house did Ms. Lopez move into?
W-Br:'),
    ('24de0684-855c-4002-834b-66269f8b76e3', 'W-Am: Excuse me, how do I get to platform six?
M-Cn:'),
    ('815031f1-3dbf-43d1-a228-839e667fac41', 'M-Cn: Who''s responsible for ordering equipment?
W-Br:'),
    ('e53a7fd3-de19-4e33-bfc6-30c0ce2e9c19', 'W-Am: What was wrong with the refrigerator?
M-Au:'),
    ('59f078e2-f0ed-4247-abc7-d7729c64cb98', 'M-Au: This document needs a signature before it''s sent out.
W-Br:'),
    ('a43efb75-6214-415b-9bd7-b2155df4f2ed', 'W-Br: Why do you have so much luggage?
M-Cn:'),
    ('16815031-f39a-459d-bcd1-4acdba9d000e', 'W-Am: You must be the new sales director, right?
W-Br:'),
    ('2d4fa5e1-59ff-49bb-bd47-87a401390d69', 'W-Br: Are you running the workshop in the morning or in the afternoon?
M-Au:'),
    ('661f132c-08d7-49a4-a63a-5c176fb76769', 'M-Cn: When should I return your book?
W-Br:'),
    ('4edb443a-41aa-4ded-bbaa-c903eef9a9eb', 'M-Cn: Where can I find the event schedule?
M-Au:'),
    ('39c10b1f-ec38-4ce2-a116-b547354fe845', 'W-Am: I''ll be late to the luncheon if I take the eleven o''clock bus.
M-Cn:'),
    ('83f6fb25-cc8e-484a-a17f-d944bf218ba7', 'M-Au: How many shipments are we sending out every day?
W-Am:'),
    ('2e2b1941-5b1b-48d2-b581-514ff004aa8e', 'W-Br: Should we replace the insulation in the building?
M-Cn:'),
    ('428be7fe-6e17-45d0-8f8d-493ca9e21d7a', 'M-Au: Do we have to stop at the post office?
W-Am:'),
    ('c56675e2-d571-4d7d-826d-613f5f2a335b', 'W-Am: Hasn''t Alan seen the doctor yet?
M-Cn:'),
    ('e3ccb1a6-8464-40f2-a38c-5b046f2389eb', 'M-Cn: Did you correct the error in the spreadsheet?
W-Br:'),
    ('f64b9d50-8100-4004-a264-ceb4eed7ca34', 'W-Am: Don''t you want to come with us to the art gallery opening tonight?
M-Cn:'),
    ('26115136-19f8-462e-9601-a78de449f10e', 'W-Br: Does your restaurant buy vegetables from wholesalers or local farmers?
M-Au:'),
    ('c75b7e56-e7c6-40c9-a952-8627b660bd23', 'M-Cn: Who supplies your copy paper?
W-Br:'),
    ('1324dc9d-2a19-4479-83fe-f39bef43c766', 'M-Au: Could you take a look at my article before I submit it?
W-Am:'),
    ('54552995-de13-40e8-8b5e-0d0aef1b7901', 'W-Am: Let me look into renting a storage unit for this furniture.
M-Au:'),
    ('f114ed0e-aa16-480f-b997-dffe97a479f1', 'M-Cn: Will the Henderson invoice be ready for review this afternoon?
W-Am:'),
    ('775d733b-0b78-4e1a-8f40-64d0df55eb04', 'M-Au: Would you like a beverage while you wait for our loan specialist?
W-Br:');

INSERT INTO migration_part2_question_text_20260811 (question_id, question_text) VALUES
    ('9eb55496-eab1-4854-ab0d-af1834f49888', 'Where is the conference being held?'),
    ('8ef35a4e-12a3-46fb-bc9e-c1bc8140cd67', 'When does the warehouse manager arrive?'),
    ('22b6a17c-c515-48f0-90a5-8b4661f24474', 'There''s a nice park nearby, right?'),
    ('8b958263-baab-4869-8d93-599c266593c0', 'Who sent the meeting minutes to the accounting department?'),
    ('21ce0d50-1387-439f-9834-af186966a398', 'I''d like to know what you think of our new finance analyst.'),
    ('d6986c9a-f911-4ab0-b4ec-349192c94035', 'Let''s go on the company retreat.'),
    ('81701533-193e-4b07-8f65-c23534bf064b', 'What time can I pick up my glasses?'),
    ('6d08e3b4-4c30-42b1-ac49-ddc1351177d7', 'The sales team knows how to use the tracking software, don''t they?'),
    ('49f061d6-e2be-44e6-bea7-f2de36cc2d7c', 'Are you going to the hardware store on Mill Street?'),
    ('7664bcf4-4f24-4f41-a94e-65cb79d1c9fe', 'Would you be able to write the introduction for the workshop?'),
    ('03429533-f87a-4ec1-9bf0-fd6422dbbbaf', 'I picked up some flowers for Tunji''s retirement party.'),
    ('ed88b8b5-e4db-4171-8e49-3121d8da181c', 'Which meeting room did you tell the interns to go to?'),
    ('d7f64fe9-6e1d-4192-bab4-2ba448d642f0', 'Is your dental appointment next Tuesday?'),
    ('8717e201-bb1b-4be6-9e70-154032fd50dd', 'Why aren''t there any brochures in the lobby?'),
    ('f6349380-735b-4a24-9089-abadfedef358', 'What''s the process for submitting my expense report?'),
    ('165fd0f6-7fdc-408e-ba55-85ba56b9ab9e', 'Do you sell your products online or in stores?'),
    ('76c976e2-cf25-4d5d-a961-a82c882c18e9', 'How often do you charge this device?'),
    ('fa6d6f75-ba95-4973-a959-32a31471a3fd', 'The tickets to Friday night''s concert cost ten dollars each.'),
    ('fdc8c5da-4d4e-46f1-9163-a1b3462ee50f', 'Can''t you update the database today?'),
    ('d21446e4-a0fb-4a7c-a830-7fd8d17efa63', 'How are we going to fit the extra supplies in that closet?'),
    ('f3d089ca-1b49-46ac-9188-bd75a7047955', 'Have all the new windows been installed?'),
    ('170016f4-88eb-47fb-a22c-58b93c8436c1', 'Would you rather go to lunch now or at noon?'),
    ('bf1cdb3c-fdc4-460e-8918-5109fee42418', 'You''re taking the training in the afternoon, aren''t you?'),
    ('9e6b4ca1-7901-4a66-bbe4-171aba48d38e', 'Shouldn''t Ms. Ishida look over the financial projections?'),
    ('4e22f6a1-6ee0-409e-90e2-0ac96fdd6081', 'When are you going to choose a new project manager?'),
    ('8a02507a-6aa0-4349-896d-c55dfbf2ef52', 'W-Am: When does Mr. Johnson leave for New York?
M-Au:'),
    ('75271e77-3b4f-4fdd-b2e0-2c0b6bd58df0', 'M-Au: Where are we holding our launch party?
W-Br:'),
    ('c45d058b-2927-4cf8-b5d8-77272d2ae11e', 'M-Cn: What kind of cake are you making?
W-Br:'),
    ('4cf61375-ecac-44f0-ac98-90a24bc1824d', 'W-Am: How many chairs do we need in the conference room?
M-Cn:'),
    ('9f86bd6f-60d9-416f-9645-5e539736d5f1', 'M-Cn: Who requested their patient records?
W-Br:'),
    ('b2f248c6-1abd-435b-b460-4db9c5ead905', 'W-Br: Should we meet in my office, or outside in the park?
M-Au:'),
    ('4efcbf00-e622-4639-a616-136610c1e4d9', 'M-Au: Why do you want to work for this law firm?
W-Br:'),
    ('0d47d454-97f2-484d-9811-e254c2c0225b', 'M-Cn: We have a ladder in the storage closet, don''t we?
W-Br:'),
    ('38459359-dc44-4ef0-9f76-46d2ad424731', 'W-Br: Would you like a refill of your soft drink?
M-Au:'),
    ('cb29684c-9419-4480-9cfd-a3c71fe98969', 'W-Am: How can I get a refund on this shirt?
M-Cn:'),
    ('be57feb7-7d97-455b-b63b-b3ff8cb1b577', 'W-Br: Heating costs are included in the rent, aren''t they?
M-Au:'),
    ('96f348b6-2aea-4b4f-9d97-cfa949c2dc35', 'M-Au: Where did Robert put the budget guidelines?
W-Am:'),
    ('d53d742a-f8a5-452f-877a-4a53df2c3a33', 'M-Cn: Did you make enough copies of the meeting agenda?
W-Am:'),
    ('124d1aa2-1472-499d-a946-618b37877253', 'W-Am: Did the caterer get back to us about the annual picnic yet?
M-Cn:'),
    ('7994595b-99a6-46c0-8ce0-6cde7ef1a5b5', 'M-Au: When was the last time the assembly line broke down?
W-Am:'),
    ('d5e0af8a-0f46-4e88-b8b6-f55159d32e09', 'W-Am: Thomas is the best project manager that I know.
W-Br:'),
    ('e58a647c-372d-42f1-bc1a-43a7efb6ebd8', 'M-Au: Wasn''t the trainer supposed to be here at nine A.M.?
W-Am:'),
    ('44e5df77-8417-49fc-9921-f8de9d3be2e1', 'W-Br: Could you show me where the pharmacy is?
M-Cn:'),
    ('b8e40b42-b2fc-49a4-af18-72058e6f1cfc', 'M-Cn: What should I do to prepare our booth at the career fair?
M-Au:'),
    ('bf06a96b-f1d5-4849-b84d-184a33dddfb7', 'W-Br: Who do you think will get a promotion?
M-Cn:'),
    ('4856f912-73d3-4d2b-9c62-620767775da0', 'M-Au: Why won''t my computer turn on?
W-Am:'),
    ('66c3fed4-4622-4a0b-a6e3-8306d8b8b4dd', 'W-Am: I preferred the original version of that movie.
M-Cn:'),
    ('bd48d826-2e79-4b58-8834-bde95627f971', 'M-Cn: Maybe you should include more quotations in your article.
W-Br:'),
    ('9ab63583-9f46-48f9-a049-91bb17855fc0', 'M-Cn: Didn''t someone have a question about the conference?
M-Au:'),
    ('e9283e4a-7d72-4aea-b23f-42fa5b37d2e7', 'W-Br: Will this be a commercial or a residential property?
M-Au:'),
    ('660891d8-97fc-4416-a04a-d7e0e51c3cf8', 'M-Au: When will the new water cooler be delivered?
W-Br:'),
    ('f0304a7d-220d-497d-945f-2877ce036ad0', 'M-Cn: Can you post the job advertisement?
W-Am:'),
    ('c2689413-b901-4cc4-8924-1fc18e30c16c', 'W-Br: What pieces will the orchestra perform?
M-Au:'),
    ('68b0505d-9847-4bbb-91c4-8de14252fc84', 'M-Cn: Why did we switch paper suppliers?
W-Br:'),
    ('1d14570e-368e-49e7-b763-1928af05bab0', 'W-Am: The prototype has been completed, right?
M-Cn:'),
    ('69b6609f-3670-44b9-8bb4-2f27bbf57b6f', 'W-Br: Where could I get a haircut?
W-Am:'),
    ('869f3c54-d249-41f9-a316-c3288a35a7da', 'M-Cn: How many brochures should I bring to the exposition?
W-Br:'),
    ('653bfd75-5342-4070-b359-fbdb17ece082', 'M-Au: Did you make your time-off request in person or over e-mail?
W-Br:'),
    ('6338317a-a4b7-4c08-86e5-4a7023ace401', 'W-Am: This rental fee includes utilities, doesn''t it?
M-Au:'),
    ('feff1ee5-2a3d-439d-bbd6-3d9c959062b8', 'M-Cn: Don''t we have to mail the party invitations?
W-Am:'),
    ('4b9298d1-b389-483b-9bb5-cc12a28410eb', 'W-Br: Who''s coming to the four o''clock meeting?
M-Au:'),
    ('bd0d7617-d7d5-43c7-9942-b4865f42c637', 'W-Am: Should we all attend the presentation?
M-Cn:'),
    ('fffe93ca-df76-4035-8b44-18b8a194946f', 'M-Au: How many study participants do you have?
W-Br:'),
    ('a0b60f08-5a51-4e4c-bd07-77f392e0e126', 'W-Am: Are you planning on buying a new tractor or a used one?
M-Cn:'),
    ('d14f49f6-f282-44f2-a331-d95ae62ecdc9', 'M-Cn: Who''s leading the networking workshop for the interns?
W-Am:'),
    ('02e407a0-95ef-4640-b8cc-c17b8bfd6870', 'W-Br: Could you tell me where the reference books are kept?
M-Au:'),
    ('8555a390-cf26-4277-8bb0-9c97c60e9a7b', 'M-Au: What''s your store''s policy on refunds?
W-Br:'),
    ('7d823d17-af13-471f-9065-af7197aa8ae9', 'M-Cn: All the information in the staff directory is up-to-date, isn''t it?
W-Am:'),
    ('795f5270-94d7-4248-95ee-4dfd59926c1f', 'W-Br: When does the market research report need to be submitted?
M-Au:'),
    ('820d3f90-f4c4-4ed4-bf13-d82e2dcb2333', 'W-Am: There''s a refreshments table in the hallway.
M-Cn:'),
    ('a42912f2-155a-42a9-b746-bd283fae5205', 'M-Au: Why don''t we share a taxi to the airport?
W-Br:'),
    ('2b4c5ea9-f4ab-4756-95ce-b5ceab6dedf3', 'W-Am: Have you decided what you''re going to do with your annual bonus?
M-Au:'),
    ('2ade664b-426e-43a1-8743-542251ae0d04', 'M-Cn: Should I visit a pharmacy or a health food store to get vitamin supplements?
W-Br:'),
    ('047ae656-2dd2-4c43-8a87-aeb6082f7457', 'W-Br: The video needs to be uploaded to social media today.
M-Au:'),
    ('a666afb6-edb6-434a-a98e-cd9602842fb1', 'M-Au: Why does Leonard have so many plants in his office?
W-Br:'),
    ('2c7ae374-adcf-404e-a0e8-a9aa5a51ec20', 'W-Am: Let''s meet in front of the theater at five.
M-Cn:'),
    ('2db8818f-b3d6-4310-86d0-d45c87fef7a4', 'W-Am: When will the sink be repaired?
W-Br:'),
    ('c5cc72bf-a964-4878-987c-4c1587798972', 'M-Au: Have they painted this lobby?
M-Cn:'),
    ('698ceafd-f67e-47f2-b8ba-754673d892a4', 'W-Br: Where did you put those budget estimates?
W-Am:'),
    ('9f499bd5-ce23-4c22-b1b3-d30c0cdd4b1d', 'W-Am: Who''s responsible for hiring decisions?
M-Au:'),
    ('eadb0486-4c4f-4566-8ed6-fb7af29a9f9c', 'W-Br: Isn''t there a sporting event at the arena tonight?
M-Au:'),
    ('5de7f957-6270-439e-a3b2-3181b72b5e57', 'M-Cn: Has your boss approved your transfer yet?
W-Am:'),
    ('4f9f6907-2f6d-46a6-959c-d0fba53e98c8', 'W-Br: Could you pick Mr. Peterson up from the airport?
M-Au:'),
    ('c844be40-d0b6-4f51-a2b4-2771ce0abd40', 'M-Cn: How do you get to work every day?
M-Au:'),
    ('80344cf8-c0f9-4fb3-8b92-58ed6db4b2e8', 'W-Am: I can''t read the patient''s handwriting on these forms.
W-Br:'),
    ('6816298a-6a5a-4d08-8f61-a0724358a692', 'M-Au: When is my first appointment today?
W-Am:'),
    ('0a77f13d-fae0-4b8c-a275-3bf6bd829abe', 'W-Br: Why hasn''t the real estate contract been signed yet?
M-Cn:'),
    ('b42c98d9-5467-47b9-802c-323a64e77e79', 'W-Br: How many kitchen appliances have been sold this week?
M-Au:'),
    ('c3dacc26-2904-4711-9b8e-93541e0b2bc7', 'M-Cn: Would you mind if I kept the door open?
W-Br:'),
    ('90e43585-c887-48cf-8d91-0c766282d283', 'W-Am: When is the team from Konrad Company expected to arrive?
M-Au:'),
    ('345e8092-89a2-485f-a97e-29d2717fc97b', 'W-Am: This is the last interview scheduled for today, isn''t it?
M-Cn:'),
    ('8fbdfebf-2f3f-442b-bdf2-11c4a2407791', 'M-Au: Which caterer is supplying food for the company picnic?
W-Am:'),
    ('2844e434-8b44-4ef4-ba25-ab54810e73d0', 'M-Au: Why don''t we ask for two office assistants?
W-Br:'),
    ('4e173e99-0adf-452a-b339-6937b2a3473d', 'M-Cn: Have we sold more tickets this year than last year?
W-Am:'),
    ('30518f9f-ff6c-48bc-aeb0-929c880bc666', 'W-Am: Should I present the sales figures at today''s meeting or tomorrow''s?
W-Br:'),
    ('b2ea0c6d-8a97-4aec-9600-492f57e57d67', 'M-Cn: This jacket isn''t as warm as I thought it would be.
W-Am:'),
    ('3781be64-db3a-47f6-bd8d-96df20c482fe', 'W-Br: We can leave our bags at the reception desk, can''t we?
M-Cn:'),
    ('10ca02be-5150-4818-a1c2-5d22c54c9890', 'M-Au: Why is Shreya leaving the company?
W-Am:'),
    ('de29f9c6-2f16-492b-b77f-e09e65d96786', 'M-Au: Should we go straight to the office, or stop by the hotel first?
M-Cn:'),
    ('608d8a9b-d641-4fe4-9fc9-d46a27844a4c', 'M-Cn: Does the security desk know that Mr. Ito is coming in today?
W-Br:'),
    ('7f89afd0-ce37-48c6-9ba3-39e06261d4a5', 'M-Au Does the shop open on Sundays?
w-Am'),
    ('11dd6bc7-6c01-4701-818a-5a6f9de87de9', 'W-Br Where did these oranges come from?
M-Au'),
    ('2ad494fe-f67c-40e2-9eeb-ceb19684dc51', 'W-Am Should I make the dinner reservation for Friday or Saturday?
w-Br'),
    ('b047c047-5075-47b4-b0a6-34eaae058736', 'M-Au Will Dr. lvanova be late today?
W-Br'),
    ('b795919d-c40d-4071-a8f0-fe01de656fd2', 'M-Au Aren’t there locker rooms at this gym?
M-Cn'),
    ('b1df3c8b-a49d-4f3f-b275-01ddda6a0656', 'M-Cn Who needs a copy of my safety training certificate?
w-Am'),
    ('491985e8-4bab-4c6b-8e2c-c2709e23cd5f', 'M-Cn Could you phone Mr. Feras and let him know we''re in the hotel lobby?
W-Br'),
    ('dfb9fc97-2f91-496e-8eea-1f5b464232af', 'W-Br Where does she sell her handmade jewelry?
M-Au'),
    ('0f0f647a-4bf3-4d1c-9b0a-24b51ca8cde4', 'W-Br You''re taking a business class in the afternoon, aren’t you?
M-Cn'),
    ('65ab852f-ee04-4e65-a34d-7fdba13ea5ed', 'M-Au Could I see some sample floral arrangements before I order?
W-Br'),
    ('97fd926b-5bbe-4512-a97a-cfaa27e9ef9e', 'M-Cn Don’t you want to buy the black sofa?
M-Au'),
    ('63c854c6-e017-4fb8-9e0a-470fa5e03625', 'M-Au Do you have this jacket in a larger size?
w-Am'),
    ('70093f8a-3cdb-4a2a-9416-ad57154a80c2', 'W-Am Where did you first learn about the job opening?
M-Au'),
    ('0b202f07-158f-4f78-9db3-f586ac00bed7', 'W-Br Should I bring anything to the meeting?
M-Cn'),
    ('e8aff15e-aef3-4f5b-a886-5f511e4f8e70', 'W-Am What was the total charge for the hotel stay?
M-Au'),
    ('07f0efbe-5eb5-4f92-a20f-6355fdbf6e36', 'M-Cn Why did you pursue a career in video game design?
W-Br'),
    ('0ec50a26-a1a5-4ab2-baac-971ffe283523', 'W-Br I''d like to attend the job fair next month.
M-Au'),
    ('0833cf33-f2db-49f6-a41a-ade0a5be98ff', 'W-Br Hasn’t anyone called you back for the second interview yet?
M-Cn'),
    ('c442e236-5215-4eef-ba72-6383e332b850', 'M-Au How many tickets do we need for tonight’s concert?
W-Am'),
    ('37dbb073-0a90-4d5a-8903-964b50974802', 'W-Am When are they going to decide who to hire?
M-Cn'),
    ('0b778c68-6d15-449a-a368-c826d0605ecf', 'M-Au I had a chance to look over the contract this morning.
w-Am'),
    ('856c2a89-8bb1-4597-9e67-d2d8b79e22e8', 'W-Am How are the database updates coming along?
w-Br'),
    ('ed962342-dcba-42ef-9cfd-7a37cc6b9002', 'M-Au When can I bring these boxes into the warehouse?
w-Am'),
    ('256ae160-35bb-4798-9db6-33f09f0a0171', 'M-Cn The market on Fifth Street is closed for a week.
W-Br'),
    ('4688dc0a-3efc-4fa2-a0c5-e13522dc9a9c', 'M-Au Does the company pay for professional-development courses?
W-Br'),
    ('77a16005-bc8f-4dc7-9124-b6b6cb34968c', 'Q: Who''s providing the floral arrangements for the party?'),
    ('f416a677-2c6e-4777-abec-788f28542a7a', 'Q: Why didn''t you finish the budget report?'),
    ('80de369e-402f-4779-b10d-a6fecb2c8dd4', 'Q: What floor are you going to?'),
    ('19cb9b4f-cb88-4e95-9fab-a1dc26104370', 'Q: How do I set up this projector?'),
    ('dedc0ed1-06a0-4a7d-9c0a-ca84ed5b4e5a', 'Q: Who has already received their promotion letter?'),
    ('7c79c500-3508-4bed-bead-0f95bcd819d9', 'Q: Did you read the press release?'),
    ('081a2286-e333-497e-938f-4afbfa021d85', 'Q: Didn''t we renew our newspaper subscription last month?'),
    ('7e72572f-6f32-4939-adbd-863e48671c84', 'Q: When will we mention our budgetary needs to the outreach coordinator?'),
    ('61606b71-91c2-4b10-bb79-f9e18063c12e', 'Q: My appointment is with Dr. Hamdy today, right?'),
    ('46d4fb76-fbb6-47e7-8631-99ba032c9aad', 'Q: Where should I store this shipment of paper?'),
    ('0d7ef291-dd7a-46c9-864a-1feb2d6ffaa0', 'Q: Would you be able to reschedule my haircut for Monday?'),
    ('3f1c1056-0920-44ba-8de2-6101249eb8c6', 'Q: Should I take the train or the bus to the airport?'),
    ('07819438-b410-4206-8b33-74f9cb2d5b6e', 'Q: How long will the online course take?'),
    ('0cb6163e-9732-439b-abcb-74a18789c359', 'Q: Will this month''s company gathering be held in Benson Park?'),
    ('b0ad6afc-ed38-4992-81d9-41d5f0d72655', 'Q: When will the tickets for the performance be ready to pick up?'),
    ('67d9aae8-708d-4a2f-b004-af1f5981b7b9', 'Q: I don''t know if the packaging materials were ordered already.'),
    ('381a899a-3bd0-4de8-8670-e7146827fb22', 'Q: Could you please send me the sales report?'),
    ('3ec6d146-392f-4487-8994-6385ad0e2031', 'Q: What type of view will your apartment have?'),
    ('28efc469-3409-490d-b3e9-c097c30d333c', 'Q: How much oil does your heater use in the winter?'),
    ('1260b9ef-90f5-4028-aadd-f1e13e24269d', 'Q: Where can I find the vitamins?'),
    ('df49ac84-7173-40fe-99d6-23fadc23e919', 'Q: Thank you for helping me create a survey.'),
    ('e98b8ca3-0c67-4256-a548-e996116da458', 'Q: When will you be done testing the new mobile app?'),
    ('ce1d846d-7d5d-495a-9ba0-63b58ed8b6b8', 'Q: Don''t forget to turn off the projector after your presentation.'),
    ('80b703c2-c9ab-4576-8519-6e62a0b29ac2', 'Q: Didn''t there use to be a parking garage on this street?'),
    ('956fe924-8543-426f-8083-b751fe4ae8fd', 'Q: Will you be available to work on Thursday or Friday?'),
    ('f4a71a17-89f5-4b43-a22e-5130b7708e31', 'Where did you put the invoice from Stanson Incorporated?'),
    ('4cb48441-392e-48d4-a2ea-632b6b14f545', 'Is the inspector coming this afternoon or tomorrow morning?'),
    ('1a190b0b-d7f2-4582-825f-bd18076ed269', 'What''s the total cost to remodel the office lobby?'),
    ('04933fd5-f807-41ec-b2e1-e41dc8d69a90', 'Are you getting the same type of desk or a different one?'),
    ('416c3b19-6924-4591-b336-a47fc2875c90', 'We''re taking the clients to the theater this evening.'),
    ('b7010145-eccc-421a-af96-2814548327b1', 'When is your budget report due?'),
    ('f6e4bd2b-51fe-4f8a-bd34-145bd63d767a', 'Who can I talk to about getting a membership at this fitness center?'),
    ('1d37cf2e-732d-465f-8ecf-c7a3056c2c8e', 'Are you planning to buy a house in the city?'),
    ('d8997642-6746-40a2-9dd0-57d972b225d7', 'How did you decide on a venue for the fund-raising event?'),
    ('5844c1c7-9265-4e2b-9664-1b4309bfba8b', 'Could you help Ms. Ishida update the expense reports?'),
    ('22da472f-4b4b-4aec-968c-f22d8ed3ef7e', 'The sales representatives really appreciated the training we led.'),
    ('71ccccd8-e30a-4886-a559-ab8b8118b3d6', 'Do you know who was promoted to senior director?'),
    ('cf5959f2-66d0-4ec6-bfa4-6bee4378dc87', 'Isn''t the registration deadline tomorrow?'),
    ('89a9e469-c828-4690-b112-c4200423e2b7', 'Would you like some help installing that new software?'),
    ('871f2209-a84d-4e90-b4f8-35217a0c0531', 'Our factory makes the best cookies in the city.'),
    ('5f525056-694a-4659-b43f-e5c71c394a4d', 'The fruit market is still selling mangoes, isn''t it?'),
    ('dcfa636b-4a5a-4d36-a680-f7934c4b7be4', 'Why are you staying in the office for lunch?'),
    ('786c368e-d73e-4336-b57e-803f8e508a78', 'How did the company basketball team play last night?'),
    ('ba53ad63-5fb1-430b-a4fe-306ad143c9c5', 'Isn''t our department''s quarterly report supposed to be sent out today?'),
    ('f36bdc11-2d50-4bfa-81a4-dded1f10643c', 'Would you like a copy of the article I mentioned?'),
    ('5988f653-826e-4270-a45d-d4f087bd7a15', 'Did you decide on the design for the new logo?'),
    ('d108475b-3571-4e39-861a-0909da6ed3ac', 'Our bookstore is having a sale today, isn''t it?'),
    ('4c6cdf2a-adb6-4819-a9c0-9f49bc6bb821', 'Why haven''t the painters arrived yet?'),
    ('c3d2350b-9d6f-4408-b44b-7e07ee1d6dba', 'Should I bring some flowers or some food to the party?'),
    ('e33bdb0d-69b4-4622-94e7-317870fe8d67', 'The meeting can wait until tomorrow.'),
    ('2d264783-52f3-4778-924c-b31b33d054c5', 'M-Cn: Who should write the press release?
W-Br:'),
    ('0076d10d-5b38-4b31-a9af-d556b86d92b1', 'M-Au: Where is the company''s headquarters?
W-Am:'),
    ('d37e7216-f725-4552-b26b-7a96da2acc3b', 'W-Br: Why are you visiting the clients tomorrow?
M-Cn:'),
    ('c2db83b9-07e0-4569-809e-7ee4036f55a5', 'W-Am: Does Dr. Allen work at the hospital or at a private practice?
M-Cn:'),
    ('5c1eedfb-7cbd-4208-829c-f92b318cfd47', 'M-Au: What''s the best way for us to get to the conference center?
W-Am:'),
    ('a46c9052-ded7-445c-8091-c36471cca668', 'W-Br: When will the forklift be repaired?
M-Cn:'),
    ('47133b15-7cb8-4939-b3c3-5b36ca17fb75', 'M-Au: Would you like me to send you an appointment reminder?
M-Cn:'),
    ('5900fe23-da15-4a06-aeb0-dad703a26d03', 'W-Br: Did you remember to book a photographer for today''s museum opening?
M-Au:'),
    ('a1d7fb2c-e012-414a-9b6e-cff1b1f3e363', 'M-Cn: Why is my computer so slow today?
W-Br:'),
    ('f0b178f8-9550-461b-b797-7078f14453a0', 'W-Br: Who''s going to stock these shelves?
W-Am:'),
    ('0e693739-174c-439e-9068-0a1792fd8951', 'M-Cn: How many bottles can these machines produce each hour?
W-Br:'),
    ('31d3f404-670f-4c91-945e-e32df5e85e74', 'W-Am: Aren''t these hiking boots supposed to be discounted?
M-Au:'),
    ('6ad4b9d4-05b7-4999-8fc9-243871b08845', 'W-Br: Do we have enough time to finish this report?
M-Au:'),
    ('7e798c2f-fdbb-4a9f-9acc-3c1a97da7198', 'M-Cn: When do you usually start packing for a trip?
W-Br:'),
    ('ac9d1357-b08c-4a0f-ba2e-b26ba0384ec9', 'W-Am: I''m going to take a walk at lunchtime.
M-Br:'),
    ('1250ce7f-0f9a-4647-94fc-5c0421950df2', 'W-Am: Can you make sure we have a sign-up sheet available?
M-Au:'),
    ('ea59f615-cc19-4905-a4eb-12b421d59106', 'M-Cn: They''re going to give each of us copies of the press release, aren''t they?
W-Am:'),
    ('6b8af782-c6e6-468e-9431-b296e1f5cc46', 'M-Au: What do most people do for a living around here?
W-Am:'),
    ('9781ffff-3339-4a91-add8-ad605648c66d', 'W-Br: How do you add toner to the printer?
M-Cn:'),
    ('05176873-3300-425b-8a87-18e95fba110a', 'W-Am: Can you send me a link to that company''s Web site?
M-Au:'),
    ('506c4377-c661-4fbc-8575-0d1543bb3169', 'M-Au: Isn''t the air conditioner set to turn off at night?
W-Br:'),
    ('e659e96b-e367-4bb8-b01c-1edc6d43142e', 'W-Am: Oh, there''s no clock in this room.
M-Cn:'),
    ('9c748529-93cf-49af-9315-8ca61f72b327', 'W-Br: Where can I go to have my car engine checked?
M-Au:'),
    ('e8c994c2-6c06-421d-82cb-7accc0c504bf', 'M-Au: To get into the building, do I use an ID badge or a passcode?
W-Am:'),
    ('e15b303f-302c-41f3-bed8-b07c4803a04a', 'W-Br: The order can still be changed, right?
W-Am:'),
    ('66513d68-824d-4ebe-be75-6d244b41fd5a', 'Which flowers should we get for Ms. Jones?'),
    ('96645e00-d003-47d0-8b35-0be26eee6397', 'Did you put paper in the copy machine?'),
    ('3b6f7b5f-1191-4a37-9ab3-7b28d75dbf68', 'Can you help me test the new voice mail system?'),
    ('428f0eae-2467-41be-8875-fc98e05a7596', 'Why Is the marketing team in the conference room?'),
    ('5a43e4c2-e54b-47e6-8351-42f6cfcb5626', 'Who is the new committee member going to be?'),
    ('487c1fae-a6ca-448a-854b-0741fc4fb230', 'Why didn''t we order more of the same chairs?'),
    ('5b1ad2d8-734e-4968-8eba-b982e9b630d4', 'How many projects have been approved?'),
    ('71c28af5-e45c-43a3-9563-8bd5decdd097', 'Were you running late this morning?'),
    ('701fe6b1-2746-46d5-86bc-62447ba59614', 'We should leave early for the restaurant.'),
    ('1258f02d-469a-49a5-9928-5314e20f74f9', 'Why did the price of these shoes increase?'),
    ('e42be931-b729-4ace-b0b3-70ca627bd316', 'Have you written down the instructions for how to operate the machine?'),
    ('93104c3a-af3d-4479-b815-a6ed509dca4f', 'How did you choose your dentist?'),
    ('e9d0e857-a366-465e-b57f-8c38e1758846', 'We should send out the invitations for her retirement party.'),
    ('9254093b-0f11-4de5-9ed0-e776c253b8f5', 'Have you begun planning a vacation?'),
    ('8ad01b5f-d6b3-4ba0-936d-767c8c0d45ca', 'Where should I look for a used car?'),
    ('248044b6-fc63-49e0-86b7-4baa2852527b', 'Didn’t Insook move into that office four months ago?'),
    ('35e53c05-3fdb-40f5-9597-926804cd22fb', 'Would you like me to type up the proposal for you?'),
    ('56876775-7be3-433d-b5b2-d185151c17ff', 'We should print more business cards.'),
    ('98a20e2d-d68d-4f37-b74f-9c62acb08445', 'Can I have a copy of the sales report?'),
    ('6a34d0e7-6cf2-4ace-abd2-21d4469aa276', 'When do you need to renew your passport?'),
    ('52fcba74-9be2-4cfd-bc7c-15958f343edb', 'Do you have this shirt in a larger size?'),
    ('ebf60937-a764-453d-9f4c-5e7e6080624b', 'Aren’t you planning to buy some supplies today?'),
    ('8ad38fd5-b2c9-4fd8-a6b9-6741d6c64ad0', 'Mary’s promotion was well deserved, don’t you think?'),
    ('bba1f449-48d4-46fa-921b-c33c438dade4', 'Should we go ahead with the project or postpone it?'),
    ('313099f1-323c-4de8-b0bd-bb71da297af8', 'Is Mr. Hernandez joining us for dinner?'),
    ('beb9509a-5a44-411a-847e-8af6abf8ebed', 'Can I pick up my prescription glasses here?'),
    ('05130878-5181-410a-9d76-8a030e587595', 'Have you signed up for delivery updates?'),
    ('5e752cc2-ee6d-401b-a23f-cdefb2459c10', 'Where are the notes from the client meeting?'),
    ('b366f1cc-5945-4d7b-9f0d-7b60c3d16403', 'Does Dr. Cao schedule appointments in the morning or in the afternoon?'),
    ('2044ba56-6e15-48e6-8b77-9fbd6b80452b', 'Can you bring these agendas to the staff meeting?'),
    ('e1b31afe-96f6-4cac-b450-15bbe00ad2b6', 'It''ll be nice to get a bonus this month.'),
    ('c52e24b6-7979-4ec9-9431-f09f86ece7c3', 'When is the city council going to vote on the new housing development?'),
    ('adbfdd56-db46-4771-8b55-f30a72402354', 'Why can''t we keep the factory open for an overnight shift?'),
    ('342b5388-be97-49b9-b0df-77fdd776bdbc', 'I put out more of our informational brochures in the waiting room.'),
    ('6be55184-c2ca-4abc-a674-eea7b7281875', 'What''s the starting pay rate for a software engineer at your firm?'),
    ('2265bf7e-3c7e-4c43-abf6-9054b4d62913', 'That flight is scheduled to take off at seven P.M., right?'),
    ('bdc27cad-70d1-4f9a-ac3a-7643afc44ad4', 'Should we take the client to Asako''s Steakhouse?'),
    ('e2dc695f-32ef-4936-9214-1527a677abf2', 'How often do you travel abroad?'),
    ('b7643ece-6156-4457-a148-2ef28a6be044', 'The product launch was a success, wasn''t it?'),
    ('90333547-c51f-4d9d-b3a0-f0e695c97480', 'How many books are in this mystery series?'),
    ('203083ac-a345-42f3-92d1-b58ae0c9921f', 'Can we finalize the budget today?'),
    ('d246f062-82b2-4a7a-b904-b94592b6c43c', 'Who should I talk to about moving some bookshelves?'),
    ('89086ea6-3044-406a-a58f-9e97814b0696', 'Wouldn''t you rather lead the workshop next week?'),
    ('edad67cd-6bcb-4d85-bef8-838fb3497d97', 'When does the bookstore open?'),
    ('08c0138a-4685-4bd2-b0d5-ca2637af8a6e', 'Can''t you help me install this furniture?'),
    ('26e2615f-3a63-4970-bdbf-b3fdc535f2a2', 'Where can I find the eating utensils?'),
    ('ffa6ec4c-236d-43f1-916c-73a86f9cf6b8', 'What can I do for you, ma''am?'),
    ('d83587d2-ac41-4fdd-abc1-889490e0b3a2', 'Why is the conference in London this year?'),
    ('1347a94f-963e-4fc0-a867-71f5845f81f6', 'Dr. Tong''s arriving at the laboratory tomorrow.'),
    ('ccf39346-dfe9-4a8c-bd14-424fa10bc33c', 'The restaurant is finally getting a new stove.');

INSERT INTO migration_part2_question_text_20260811 (question_id, question_text) VALUES
    ('38d8880d-e83f-4f65-9d9b-f378cbaf2e26', 'W-Am: Where did you leave the account files?'),
    ('1720f371-3ad1-4abf-80c2-4ca9ae479cdd', 'M-Au: Who should I call about the broken window?'),
    ('72c868bd-e5d7-4d84-b690-c4e06306e0e8', 'W-Am: You ordered more parts for the motor, right?'),
    ('81502024-5c6b-4aea-bf40-8038c8e86ade', 'W-Am: When is the rent due?'),
    ('25da678b-b293-491a-9975-0a2b537fe3ba', 'M-Au: Why don''t we submit the supply request?'),
    ('84374e80-5c43-4875-a73a-c0f333299d30', 'W-Br: Won''t you be at the panel discussion tomorrow?'),
    ('589b828f-7bf5-45f5-b2de-7162ef560b35', 'W-Am: When did Susan ask for a computer upgrade?'),
    ('648929d5-d8d7-4af7-b8c4-1e0ecb2a12c5', 'M-Cn: Do you work in marketing or public policy?'),
    ('c40f9858-85c5-41af-8763-bd626ba605fc', 'W-Br: Are you available for an interview next Tuesday?'),
    ('fd9320d0-19bf-46c0-8be3-f77edc87f2d6', 'M-Cn: How did you make this soup?'),
    ('ec57b21e-4483-48d7-8444-c24e282065d4', 'W-Am: Wasn''t the office furniture shipped last month?'),
    ('a0c2f2f9-ce20-40aa-be8f-236269030578', 'W-Br: Do you have some paper clips I can use?'),
    ('036e9d14-ea7f-4455-b64d-8e8578a2f921', 'M-Au: How do I change my password?'),
    ('25618c90-ca74-49b4-8447-7ec7d349f02d', 'W-Br: You can''t get us an earlier flight, can you?'),
    ('0c8493cc-ce83-4139-bfa1-ca4de7b8f709', 'M-Au: Why is the door locked?'),
    ('45aa24f1-348f-448e-85d5-db86d22c61d7', 'M-Cn: Are you using the copier?'),
    ('613ac883-3198-4791-b08f-24aa06ac9517', 'W-Am: I really need the updated expense report.'),
    ('9f1c139f-dabc-4586-803c-6b60fd5e6621', 'W-Am: Who''s leading the logo design project?'),
    ('27f80673-585a-4f36-bc3b-b1fc27d81012', 'M-Au: What happened at the workshop yesterday?'),
    ('2b9c5e1b-b30f-4539-8e18-949471df44c0', 'W-Br: Is there a dressing room where I can try these sweaters on?'),
    ('699ec68d-c682-45bc-a159-bc92bcabf62d', 'W-Am: The dinner with the clients is Wednesday.'),
    ('9f7e995c-8edf-4e51-9f68-e39916f7e06b', 'M-Au: Why is the financial forecast still not finished?'),
    ('4f684996-fa5f-4f52-bd19-70e9b08e1548', 'M-Cn: What did you think about that presenter?'),
    ('61fd29fc-ed93-4c54-84a4-e4c3db8b64b0', 'M-Cn: Is our production line operating again?'),
    ('df972cba-c442-41aa-a274-976e30de2f1c', 'M-Au: I''m going to put on my sweater.'),
    ('3019f280-857f-45f4-812d-b57b43617643', 'M-Cn: Who was invited to the press conference?
W-Br:'),
    ('7f89ad07-3605-492d-92a3-a011c7737b2d', 'M-Au: Is Mr. Yagami thinking about moving the factory?
W-Am:'),
    ('5239ef7b-ce44-417d-94cc-848ede2a9629', 'W-Br: When should I set the appetizers out?
M-Cn:'),
    ('b010bef7-42e9-4c2d-9113-8b9636df5812', 'M-Au: Let''s discuss what the consultant recommended.
W-Am:'),
    ('f9885674-60a3-4d04-a249-0a75973fc710', 'W-Br: Which training seminar is being held this afternoon?
M-Au:'),
    ('37ccaa9c-7535-45e0-af8a-f1924ea12fe5', 'M-Cn: Why''s the music in this store so loud?
W-Am:'),
    ('c85de04b-98e1-426a-a831-fbae4b4e0a91', 'W-Br: The clinic''s busy today, isn''t it?
M-Au:'),
    ('7b74895d-fd10-4700-b326-da7d7246cb48', 'M-Cn: Why are you looking for a new apartment?
W-Am:'),
    ('02ca7d28-43e7-4729-b20f-f1ab253d8683', 'M-Au: When did your company update its logo design?
W-Am:'),
    ('41e9afaf-441c-4484-9ec2-3ab6a6eb9d8b', 'W-Br: Where are the workers taking those old files?
M-Cn:'),
    ('07050698-8647-4764-8c02-ac1c57f8cdf9', 'W-Am: You spelled my name incorrectly here.
W-Br:'),
    ('01e2e2f7-7999-49f3-81d1-ee1f0cda9872', 'M-Cn: Won''t you be conducting the interviews with us?
M-Au:'),
    ('5ee33f36-fe4b-40e2-97f8-89682787926a', 'W-Br: You revised the employee handbook, didn''t you?
M-Au:'),
    ('21b4dbfb-a129-41af-b4fd-71cec7d7ee14', 'M-Cn: Jin-Ah can help you plan the workshop.
M-Au:'),
    ('8d09e218-ee84-4a3d-88fd-24e878a6c4e0', 'W-Am: How do you adjust the height of these chairs?
W-Br:'),
    ('7cc808d7-1334-4d8d-82b3-b2c8c53f2af7', 'W-Am: Shouldn''t the text on these slides be in a larger font?
M-Cn:'),
    ('7dbce97c-7622-43a2-b452-a88fc56bec46', 'M-Au: Do you go to the botanical gardens often?
M-Cn:'),
    ('0f3e947d-1c14-4916-bf5b-cc3216273a55', 'W-Br: How do I join the company book club?
M-Au:'),
    ('bb049406-899f-4c0d-ba4e-01696bc585c5', 'W-Am: Isn''t there going to be traffic on the highway?
W-Br:'),
    ('0e0f9997-a139-4448-841f-acbd973914ad', 'M-Cn: Excuse me—my suitcase still hasn''t arrived at baggage claim.
W-Br:'),
    ('295fbadc-0cda-4b04-9365-d2d06b382935', 'M-Au: Where should I submit my monthly expense report?
M-Cn:'),
    ('e1be7fd3-ce8b-465d-a376-bd2e7e13b845', 'W-Am: Could you post a reply to this customer review of our cafe?
M-Au:'),
    ('404f8971-913c-44ae-acd5-0e78ad570cdb', 'M-Cn: Shall I buy a flower arrangement or a nice card?
W-Br:'),
    ('db9fa4cb-305b-43c0-8228-e5f806e85ec9', 'M-Au: Do you know where the elevators are?
W-Br:'),
    ('deb8647d-7b56-4c8b-95c5-891900e6bf9f', 'M-Cn: Should we reserve a booth near the entrance to the hall or near the catering terrace?
W-Am:'),
    ('1eefd901-3344-4b16-9107-ce4333f9108a', 'Would you like me to order some more business cards for you?'),
    ('70b525be-323c-4613-aa5c-8258c17c6e1d', 'Why don''t you ask Ms. Kim for help?'),
    ('2dd80b4c-5ab9-46f4-91eb-2cca30b2fb8e', 'Do you want to review the report together, or on your own?'),
    ('4c62812d-3162-49e6-91e3-310e07c70d44', 'When''s the marketing conference?'),
    ('684fe6cc-6986-4a9d-8e67-ece4039c61e7', 'Where are the safety goggles kept?'),
    ('dad58e67-d537-4427-a2e5-7271be847d13', 'When did this restaurant change its name?'),
    ('5f6760d8-094a-4750-9fb8-9e9f3310e143', 'Did we complete the inventory, or is there more to do?'),
    ('ccc5c412-d808-43ed-948b-daefca949202', 'Can you get me a sandwich from the café down the street?'),
    ('f848a838-177c-4757-a891-ba06f962fb30', 'How can we interest the client in our business?'),
    ('3275a5a6-77ee-424e-8eba-55ca96e2d925', 'Are you planning to work at home tomorrow?'),
    ('99a31334-2326-421b-8e9b-5a295cfcd8b0', 'Don''t you have the promotional materials with you?'),
    ('dfdaf53b-28a5-4274-8219-053f91a1400d', 'The projector needs to be fixed before our presentation.'),
    ('fee7200f-3493-4333-a40d-33b1d4eafa44', 'What''s the price of this printer?'),
    ('e414225d-6431-4dc4-946d-e4cee2b1b2ab', 'How many people are attending the orientation session?'),
    ('9b54e94c-ebab-423d-b8dd-ae44a80d48d4', 'There''s a free shuttle bus to the airport, right?'),
    ('fee9f41c-8b81-4eff-a643-bf28406fd8a4', 'Who has time to edit this article?'),
    ('6b467844-e12a-46aa-99f5-c7dcdf0faa63', 'What time does the factory shift end?'),
    ('8f21cc31-f241-44fd-b302-569494d63b9b', 'These train tickets are expensive.'),
    ('c65fd16f-4f51-4959-85db-99acd765b511', 'Isn''t this television prototype supposed to have more advanced features?'),
    ('357bd27a-2410-489b-bbd1-ad895f1d628d', 'What should we do to prepare for the sales meeting?'),
    ('f725acea-6a2d-4b68-a31b-4b0ebcb7a429', 'Do you think Ms. Wang would be interested in joining the event planning committee?'),
    ('2ddc1723-141f-4082-ac59-c7f52e9f9d1f', 'Dr. Marino has the survey results on his desk.'),
    ('9eac8995-0f25-4be4-af79-bcaed1c32f82', 'The keynote speech wasn''t very inspiring, was it?'),
    ('28fa9d79-215a-48fd-a25c-4a66f78f2341', 'Our company is upgrading its bookkeeping software.'),
    ('dc921a9b-07f0-4438-848a-ffaacce27af0', 'Should we set up the buffet table for tomorrow''s luncheon indoors or outdoors?'),
    ('0d22de37-c416-4bea-92aa-cbe69321a5c9', 'M-Cn: Who''s in charge of the storeroom inventory?
W-Br:'),
    ('887472cb-bea8-4233-a44f-38f7c55c6938', 'M-Au: Where''s the filing cabinet?
W-Am:'),
    ('3172af0c-d1a5-429a-9554-69ef25724e69', 'M-Au: When does the train from Hamburg arrive?
M-Cn:'),
    ('72724464-42d8-4037-ae30-d9d298c06ca5', 'W-Am: Can you stop by my office later?
W-Br:'),
    ('1749a1cd-5abc-4c1e-a38a-7a4094e4b19b', 'W-Am: Why was the meeting postponed?
M-Au:'),
    ('ca5b55dd-1c57-45ce-af78-080f1cb6a84a', 'W-Am: When are you going to the art gallery?
W-Br:'),
    ('618443a4-d9b4-4ec5-b5ae-b9bb7bab2a45', 'M-Au: Where are the loading dock supervisors?
W-Am:'),
    ('c66483de-8908-4767-a78b-ec3f87b5d255', 'M-Cn: You haven''t always worn glasses, have you?
M-Au:'),
    ('1a3c2294-191f-4d78-aa6c-1008ce07889d', 'W-Am: Isn''t that apartment we looked at last week still available?
W-Br:'),
    ('65a1744e-013f-4178-b414-1f4704b67a27', 'M-Au: Why don''t we go on vacation to London?
M-Cn:'),
    ('bd096d61-7697-49aa-a80a-2cf41d227386', 'M-Au: How do I start a conference call on this system?
W-Am:'),
    ('7413ea20-6e7a-43a0-aa05-f6ef0bcb0e49', 'W-Br: The new printers are very popular.
W-Am:'),
    ('a58b71f5-fa4e-45d3-97f4-44112cbb74d7', 'M-Au: What''s the agenda for today''s meeting?
W-Am:'),
    ('b32309d1-a495-4733-820c-588257f95f9f', 'W-Br: Are you sure we''ll be able to meet this deadline?
M-Cn:'),
    ('635205e3-f12b-4998-ae1a-02d61c85e9af', 'M-Cn: Why don''t we make special T-shirts to sell at the music festival?
W-Br:'),
    ('7d0b5cc0-b799-471b-a6e8-87ada6527325', 'W-Br: We should update our logo design, shouldn''t we?
M-Cn:'),
    ('da09b9a5-26cf-40ee-bd27-01f6e4beb146', 'M-Au: Was the research project approved?
W-Br:'),
    ('a1fe9cd5-e05f-4add-949d-d465a70e6582', 'M-Cn: Do you need help setting up for the performance?
W-Br:'),
    ('cd2c863e-5acf-4fd2-b689-69c52622b0fb', 'W-Br: Fairway Motors just ordered another thousand extra-large tires.
M-Au:'),
    ('0aabc132-0469-4ef4-8a41-e9088752620a', 'M-Cn: The labor costs will be itemized on the receipt, right?
W-Am:'),
    ('dd3cadfc-7427-4312-944b-4c440f101fec', 'W-Am: I don''t think we''ll have time to eat before the next conference session.
M-Au:'),
    ('2b392cca-436a-4c24-883e-9fce80001549', 'W-Br: Are you in charge of supply chain management?
M-Cn:'),
    ('844e411c-85b9-4a91-83bd-f7bd50559e8e', 'W-Am: I think we should ask Ms. Sato for her opinion.
M-Cn:'),
    ('d69deff2-465e-4afb-a7cf-b322d7703b32', 'W-Br: Would you like a table by the window or the buffet area?
M-Cn:'),
    ('e875489b-e3bc-4f45-9454-7a10c4573424', 'W-Am: Hasn''t your parking permit expired?
W-Br:'),
    ('ef84a5e3-5076-4938-9ef5-ac30db2facdf', 'W-Am: Who was hired to be the manager''s new assistant?'),
    ('557e403a-c4e1-4325-b339-18e1ea947ce0', 'M-Cn: When is the final budget due?'),
    ('021d9948-6800-4d68-9600-68dee9540dcc', 'W-Br: The store has another location in Brentwood, doesn''t it?'),
    ('ce7c2ca7-92ce-46a4-98c2-6ca8fa9527b9', 'W-Am: Would you care to join us for dinner?'),
    ('311437b5-4ff2-4b9b-aff8-20d199398289', 'M-Cn: Did Lisa pick up the invitations from the printers?'),
    ('5abe7c50-71d0-4278-bc40-cf5e29bafae8', 'M-Cn: Which dance performance did you like the best?'),
    ('36ba9b97-05da-4ac0-a40c-996120534e95', 'W-Br: You''re going to Melbourne soon, aren''t you?'),
    ('e0ee0377-ca73-4ab5-a97b-1ab65add74ec', 'M-Au: When can we expect the shipment?'),
    ('5a007c8c-5e02-463e-a5d9-34fbbd63cad0', 'M-Au: Can you handle this client''s complaint?'),
    ('cc0240a5-86ad-46cc-9417-d1c7c22f96c8', 'W-Br: How much will it cost to fix this computer?'),
    ('695783b1-1549-486d-a301-384771d49a76', 'W-Br: Won''t Ellen be organizing the conference this year?'),
    ('7c7414c1-39f9-4173-bb4d-6cb0deb92ea2', 'W-Am: Where are the half-price shoes?'),
    ('d42dbacb-37f5-4b8f-8b1d-0a6872c227ca', 'W-Br: Does the apartment building have a parking area?'),
    ('095d3f3c-b211-4a04-9a2b-d3cd82fef3b1', 'M-Au: When were these forms authorized?'),
    ('1de41936-169c-436c-bb07-faaaa4c9f693', 'W-Am: The table should be set before the guests arrive.'),
    ('b1259c85-79b1-415e-b0d4-3aca4b61db7e', 'M-Au: Today''s all-staff meeting wasn''t well attended, was it?'),
    ('9ca5840b-7436-4689-86ad-f984dad33b1a', 'M-Cn: Didn''t you reschedule your vacation for August?'),
    ('1ba40b3b-dc8c-43b7-8a20-710dc853cb0e', 'M-Au: Which of this week''s training sessions should I sign up for?'),
    ('cf7ed11b-d2bf-4b5c-92c7-0b15bfaf5ab8', 'W-Br: I''d like you to present your proposal at the next council meeting.'),
    ('725474b8-834b-4b08-b8da-5778dac1b4a3', 'M-Au: Should we make copies of the budget for the team or e-mail it to them?'),
    ('64f258b9-a6f7-48ee-8173-ffd1364bb13e', 'W-Br: I''ll pick you up at the bus terminal at eight-thirty in the evening.'),
    ('8bd08ad4-25c6-4783-9713-1eb92ff05250', 'W-Am: Will we hire one delivery driver or two?'),
    ('c5804027-c464-46a8-a396-e0e90be0b05a', 'M-Cn: Has the new software been installed on your computer yet?'),
    ('ab7588c2-dbe5-4e35-9ed8-8c56ea0ba22f', 'M-Cn: Why are they cleaning the carpets now?'),
    ('8adbda48-8cba-4bb7-9f14-8b74b7ae021f', 'W-Br: I thought we were moving to the new office next week.'),
    ('e465d50a-bc7c-4a66-b810-b151e1c92471', 'M-Cn: How did you like the book?
W-Au:'),
    ('80a71014-9a73-484b-8440-16536ec9dea7', 'M-Au: Where is the security office?
W-Br:'),
    ('6a141b8a-0698-4cd2-9a7c-8bde76cf90d3', 'W-Am: What did you think of the orientation video?
M-Au:'),
    ('109d885c-c962-4de1-bcae-110c4f5b4243', 'M-Au: Should we ask Donna to give the product demonstration?
W-Br:'),
    ('526a898a-1d24-4f41-907c-4de7c622e070', 'W-Br: What is that interesting building across the river?
M-Cn:'),
    ('5c27a9db-2b8d-4f89-9fe7-12bce75ad756', 'M-Au: Will the clinic stay open while the road is being repaired?
W-Am:'),
    ('f3607246-cfc0-4e69-860c-777660cf1236', 'M-Au: When will the inspection take place?
W-Br:'),
    ('a40065e2-4406-475c-ad5c-7a2d3a7b1a97', 'W-Br: It''s going to start raining soon.
M-Cn:'),
    ('b7c242e4-fd3c-4f43-823d-5ecf70106ead', 'M-Au: Why did the candidate turn down our offer?
W-Am:'),
    ('8b0e34da-420e-4c8b-bc13-4d52479031e2', 'M-Au: Which project is our crew working on next?
W-Br:'),
    ('c00a63eb-e7a2-4595-98c1-a401f674d4ed', 'W-Br: Aren''t you supposed to be leaving for your business trip?
M-Cn:'),
    ('d1215627-9a73-4fa5-865b-62f08ce15879', 'M-Cn: Why don''t we redesign our sandals this year?
W-Br:'),
    ('55a41e36-8bf2-4ba4-9211-aafee51e67fa', 'W-Br: How many buses will we need to take everyone to the retreat site?
M-Au:'),
    ('e3113088-6ec8-46d8-ba10-60a9f8a7e9e9', 'M-Au: Are we giving our clients wall calendars or desk calendars this year?
W-Cn:'),
    ('aa24e502-8748-47b2-8a88-630a3bbf23e8', 'W-Br: Wasn''t that food festival postponed again?
M-Au:'),
    ('c9f391b8-2cfa-48da-9a9e-396cb87ff719', 'W-Am: The office relocation is taking longer than we hoped.
M-Cn:'),
    ('f1ecae2f-7090-4a3d-b7d4-6bc8f08901a2', 'W-Br: Why did Mayor Shin call a press conference?
M-Cn:'),
    ('27a3180d-aa77-4a04-9fff-2415520f05b5', 'W-Am: The projector in that conference room is still out of order, isn''t it?
M-Au:'),
    ('f0cbb8bc-0b08-4829-b519-56fdc1d06e03', 'M-Cn: Who knows how to report a maintenance issue?
W-Am:'),
    ('32117654-cf5a-4d05-a7b5-ec9515b2ddb1', 'W-Br: Why is the exhibit on European painting closed?
M-Cn:'),
    ('60245087-7904-41c5-b3f6-3dc4a1179f6e', 'W-Au: When do you want to meet to sign the contract?
W-Am:'),
    ('d32bb3d4-8de7-4852-900e-cdfabc4b6027', 'M-Cn: What should I do with these old bank statements?
W-Cn:'),
    ('6cac3aec-a93c-4724-b989-5a33127a4d0b', 'W-Au: I''d be happy to pick up the executives at the airport.
W-Br:'),
    ('90dd318f-ebd4-483b-968f-42febabc41fa', 'M-Cn: This credit card''s annual fee is quite high.
W-Am:'),
    ('2b78b8f6-0b1c-48d7-b1cf-3f427ebe86ac', 'M-Cn: Selma, could you order more file folders?
W-Br:'),
    ('50b56cc9-9570-4463-ae05-6c939023a4dd', 'M-Cn: Where''s the marketing department?
W-Br:'),
    ('6ab52216-4641-4502-96c6-a72bc7df8fc3', 'W-Br: What time does your flight leave?
M-Cn:'),
    ('5a301ba2-8a86-48c9-a8ac-729338060505', 'W-Am: Who reviewed the order forms?
M-Au:'),
    ('eced2a84-bf1a-4896-a376-cdfcb4f955db', 'M-Au: How much do the tickets cost?
W-Br:'),
    ('fa9ca900-001e-4b05-b400-d51c9fc4f6a2', 'M-Cn: Would you like to have lunch with us?
W-Am:'),
    ('6066420c-4373-4c37-b15f-5e0df8975548', 'M-Cn: Should we discuss the merger tomorrow or Friday?
W-Br:'),
    ('88e21f1d-f5af-458e-975a-c4fb562e2dba', 'W-Am: Why are you still at the office?
M-Au:'),
    ('a6aa0c5a-6db4-4d0f-8a9e-319613eaaae1', 'W-Br: Doesn''t the art exhibit open today?
M-Au:'),
    ('2d17a9a6-9c14-4a32-a246-57ebf8a32d92', 'W-Am: When did Takumi start working here?
M-Cn:'),
    ('d0f996e5-07c0-40d7-8dad-6f1ba6761881', 'M-Au: We still sell this brand of washing machine, don''t we?
W-Br:'),
    ('b2a053d1-064a-45ae-8949-9646a3af768a', 'W-Am: Haven''t you finished the report yet?
M-Cn:'),
    ('1664018e-10a5-4f68-8f68-a7baca3b6596', 'W-Br: Do you want to fly or drive to the trade show?
M-Cn:'),
    ('6decbea3-edcd-4c93-8dd2-ca1764669f87', 'W-Am: Who''s leading the focus group meeting on Friday?
M-Au:'),
    ('734337fd-995a-476c-b06d-768a24bfa276', 'W-Am: Why don''t we create some videos for the interns?
M-Cn:'),
    ('4bb3ad72-713e-4d2c-9256-b49e70199f4c', 'M-Au: Parkwood Bank has extended business hours today, doesn''t it?
W-Br:'),
    ('74ab4d2b-8024-4716-8f2e-a5c13c3ea1a7', 'M-Au: When do concert tickets go on sale?
W-Am:'),
    ('d23da91a-31da-4858-8802-565a9987cb33', 'W-Am: Has anyone volunteered to organize the reception?
M-Cn:'),
    ('e710bbaf-59ab-47ce-b3e4-cc1cb492b867', 'M-Au: How do I turn off the copy machine?
W-Br:'),
    ('889d3ff2-d145-4929-b3f1-314c9af452d8', 'W-Br: I''m calling to make an appointment with a physical therapist.
M-Au:'),
    ('1e486269-147c-4333-9c3a-2c3d1fd3569a', 'M-Cn: Our fabric shipment hasn''t arrived yet, has it?
W-Br:'),
    ('1aec4a5b-c478-413d-be95-029472ccd45f', 'W-Br: Did you send all staff the revised vacation policy?
M-Au:'),
    ('181a4660-1da7-40d9-bf3d-110c31727747', 'M-Au: What''s the telephone number for Primavera restaurant?
W-Am:'),
    ('dce6c385-40e4-4810-a35d-0d24a3b2e142', 'M-Cn: Could you represent our company at the recruitment fair this week?
W-Br:'),
    ('f6b68db0-7a15-4e9f-bbf7-410a7ed40380', 'M-Au: The engine''s been making a strange noise for the past hour.
W-Br:'),
    ('f7846e50-657a-4236-9cc2-14fc36c9ef3e', 'M-Cn: Where can we buy a microwave oven for the office kitchen?
W-Am:'),
    ('077b542e-f4e3-452f-be6e-be30ef981922', 'How was the security audit today?'),
    ('3a5eb434-3963-44ee-bff8-d9db9b427daf', 'What dinner specials do you have today?'),
    ('edd1524d-f6fa-44a5-8fee-4173423376d7', 'When will the order be delivered?'),
    ('e67f35e1-1b6c-44c5-864c-582123393805', 'What’s the monthly membership fee for that service?'),
    ('0f0cadc7-12da-41bc-b1b1-84d0af2c9a53', 'Did you receive the e-mail I sent?'),
    ('dea83ae6-b99b-4a38-9436-7df7983f6a7c', 'Why don’t you have the meeting this afternoon?'),
    ('e3553c8e-2d77-4770-9234-ae5a6e7a14d3', 'Where did you post the schedule?'),
    ('2884b77e-e386-4cf7-a226-e4c82916e336', 'Who is leading the safety seminar?'),
    ('c6316bca-e93b-4e7e-b240-cc51a0899f19', 'Could you please fill out your time sheet by 3 P.M. today?'),
    ('726e0fa4-08b8-44c7-b42f-1276e9286d42', 'When is the electrician supposed to get here?'),
    ('4c796994-2386-4f13-a143-d0994e56d4ed', 'I’d like to schedule your performance review meeting.'),
    ('bc973371-b131-44d0-8456-749afb747b09', 'Haven’t you been trained to use this machine?'),
    ('a77fdaf8-f54b-477f-be25-0e4764f1ae54', 'Did you bring your computer home or leave it at work?'),
    ('2327adcc-4a6c-42fa-b07f-8c719dc72e0d', 'Why don’t we create a video tour of the convention space?'),
    ('f3c39c36-f064-4a1e-9a98-57944f5933d5', 'Isn’t the food usually served at this time?'),
    ('62f3e0ff-3061-4159-b117-a35489bc3b7a', 'Do you take the bus or train to work?'),
    ('7173c93e-30d8-41e6-b5f4-53460fbf6163', 'Would you like me to make the reservation for you?'),
    ('3d4cd6f1-7c48-4c73-88f8-3841611ae929', 'Why are you cleaning the laboratory?'),
    ('b4e364a6-a706-4a63-aa5c-7c598ba86265', 'What do you think of the highlighted paragraphs in this document?'),
    ('5dff0583-0f1a-4521-8a2f-ebc324665319', 'Who’s going to receive the final delivery?'),
    ('146a942f-c492-4a1e-9bb8-95b824e08e2d', 'I could book our flights now, right?'),
    ('815b9fb6-42ce-45b5-9091-501968240d76', 'Why do we have to reschedule this event?'),
    ('9e95ed23-112c-45fd-9da6-e1dc11db483d', 'We should really consider expanding our storefront.'),
    ('19350319-d2fa-4bd9-a7f1-9f7a82d88d03', 'Do you know whose jacket that is in the conference room?'),
    ('ada19f2e-7e51-455d-b097-0ac089847397', 'When do you usually exercise?'),
    ('4defcf24-6d4a-40cf-a42d-3fb96fe00ef0', 'How old is this building?'),
    ('9e7c23a7-4c55-4cc1-bcc3-7238fd57f857', 'Can you come to my jazz performance tonight?'),
    ('ec8b6644-8305-4804-ab23-2a4f41d3df7c', 'Which apartment submitted a work order?'),
    ('4ca40fbc-c4a9-44bd-9753-2fc12dbcfa43', 'Will you contact the vendor about changing our delivery date?'),
    ('fed54931-5e60-4145-b12b-7bb51a2530aa', 'Why was the maintenance worker here?'),
    ('883725bf-b9ef-4477-83d8-db5a15b07837', 'Did management make a hiring decision yet?'),
    ('0bec31e7-0f5a-4d6f-8c4e-99236bf287d7', 'Do you want to eat here in our cafeteria or go out?'),
    ('6cb842f8-5f35-4a5a-82c8-c5446c8f7124', 'Didn’t you e-mail the employment contract to Mr. Patel yesterday?'),
    ('71eb69a3-2c93-4176-a618-3bab36805920', 'Our division’s picnic is this Saturday, right?'),
    ('a741ad0d-4dae-458c-8783-99b6264bb549', 'Would you like coffee or tea?'),
    ('a618c3cc-fbfb-4b93-afbc-4536da19cab7', 'We achieved our sales targets this month.'),
    ('b9f17291-daf4-4ef0-9a3a-075aff3ff7f8', 'How often do you travel for your job?'),
    ('f89ae4bc-7bf9-43e4-a204-de74b7ea1760', 'We should hike the Wildflower Trail today.'),
    ('d8c12404-3efa-45a1-bf3b-ef3ccf516f51', 'You’ve booked a hotel in London, haven’t you?'),
    ('56f1c8ff-f33f-4653-86dc-908a9f0abd24', 'Are there any tickets left for tonight’s concert?'),
    ('5ae1e3cd-8fc9-4355-80ff-723568ff93a9', 'Haven''t you used this software before?'),
    ('77e08828-7fcf-431b-a4ea-502a658b52fe', 'When is the new blender going to be released?'),
    ('97466103-db95-41bb-862c-819626593655', 'Who’s picking up our clients at the airport?'),
    ('0050ea34-ac15-41ac-9734-0495a6b5335e', 'Where are the red roses that came in this morning?'),
    ('34309e5a-172c-4165-929b-424a90bbae97', 'This film has been nominated for several awards.'),
    ('a16e1743-3f0b-4bf5-8a50-e5b79f62bf77', 'Who''s interested in starting a car pool program?'),
    ('94164134-3d00-4d3e-91d0-8e43252be207', 'Where will I teach my workshop this month?'),
    ('fe2876bf-c47f-4188-bb51-82a7588a9a07', 'Why are we moving these sweaters to the back of the store?'),
    ('a812ec8f-a41b-4beb-b167-dba5ae3ba451', 'Would you be interested in working on some of these contracts?'),
    ('f9c3948c-7d0a-4eb6-9b15-92f13fa8eefb', 'What type of job are you looking for?'),
    ('c2a1f9ea-2531-4c4a-b8b6-b31c02fea98f', 'Where can I buy tickets for the orchestra’s fund-raiser?'),
    ('8aaf7c3d-0f9f-4ace-a6f4-4424516db62c', 'How long does your commute take?'),
    ('e1961da9-0f54-4f27-879b-5e37584af4d3', 'What’s good to order at this cafe?'),
    ('a36dbbff-c55b-43f0-863a-aee5bd4ba2ab', 'When’s the new office furniture going to be delivered?'),
    ('0b7bfc4a-0580-405c-bc35-888abe64ea97', 'Who’s holding the training session on Thursday?'),
    ('366d2897-4ad8-4e25-b63d-687e0898736b', 'When should we hire extra help for the holidays?'),
    ('43191dfb-78b1-4471-ba80-dc7d24e739e6', 'Why did you pick the color green for the product packaging?'),
    ('9ba25737-247c-4679-ba56-ddee5d3f4d5a', 'When''s the budget report due?'),
    ('a2ac9628-0ddc-4f88-be97-9d7162cdf5f0', 'Which shopping bag should I bring?'),
    ('888bf126-6372-43fd-b89c-106caf21b3c2', 'Don’t forget to add another table to the conference room.'),
    ('6e893e7f-066e-4696-9502-0836b9254e24', 'Who from our office is going to the conference?'),
    ('01e013ce-59f9-4bff-80ad-0f1285aab66b', 'Where are the signs for the sale?'),
    ('5d732a8e-5f80-455c-829d-9bca5209c2b9', 'Do you think we should place an advertisement in the newspaper?'),
    ('640330dd-a4c7-49df-9e9e-9593d148b617', 'I don’t remember where I put my copy of the contract.'),
    ('a8b93492-7cc8-4f80-ae71-05e1585abcfa', 'What should we order for dinner?'),
    ('01cac12b-d741-4a9a-a2de-e4a47528dc5f', 'I thought the new safety training was supposed to start tomorrow.'),
    ('0fb7653f-1427-4164-b490-777c0200932e', 'Should we buy desktop computers or laptops for the office?'),
    ('1415ec2d-b6ff-4173-b35c-077c2c2b3b3b', 'Will you be attending the reception tomorrow?'),
    ('0c53b387-2e16-4863-bd09-5e6ef082e0bc', 'Did you buy your ticket to the baseball game?'),
    ('2ee0321b-4319-4736-aa07-069a7cccfc95', 'How can I get more information about the employee party?'),
    ('7c836b95-fbf4-4db9-9d7a-71542fd0242a', 'Could you show me how to transfer funds?'),
    ('7946f831-3ae3-4907-b1ea-e8c05a4fa58d', 'Will our gym memberships renew automatically?'),
    ('d2460401-5167-4f97-8eb9-aaff308b66e5', 'Isn’t Shinji scheduled to work at the cash register?'),
    ('7a976376-f160-40e8-bac6-138e2c02055a', 'Do you have all the ingredients for the recipe?'),
    ('0d262aa0-c857-4f5b-8e76-baed6df7491f', 'You’re in charge of the supplier discount program, right?');

INSERT INTO migration_part2_question_text_20260811 (question_id, question_text) VALUES
    ('cb071f1f-5a1a-4795-a0ee-d4423d35e842', 'When will the office be open after the renovations?'),
    ('7ec96b33-749f-454b-808d-470a4433677f', 'Why didn’t we order more watches for the store?'),
    ('731ba9ed-45ef-44ec-b5ba-f2afd30378d7', 'Which workshop do you want to attend?'),
    ('7cd05a11-5c79-4f6c-8eea-aafd7bee9c4d', 'Who else needs to approve the logo design?'),
    ('648f6b90-387f-4f3a-9f41-8ef33d0034ef', 'Can you please turn up the lights so I can take a photograph?'),
    ('7913a753-5621-463b-8141-a47c3fad1a87', 'Where can I get my passport renewed?'),
    ('917eec10-c593-4a0d-9c7b-742b8596068a', 'How are we going to increase our sales?'),
    ('063d047b-3a65-4691-b008-32ab0d4e8b76', 'Why did you replace the coffee machine in the break room?'),
    ('f1ecd5de-6aee-4ad3-9d5b-5cfff35e9bd1', 'Where is Mr. Kim meeting with the new interns?'),
    ('6e3f9ab2-165d-4305-8d14-6dd59e447672', 'When will the client sign the contract?'),
    ('c0074ddd-4a58-4633-9765-dc5c488bdf02', 'Can I order some dessert?'),
    ('3395bd95-687f-45b7-9816-249ee1937811', 'Isn’t Mr. Romero managing the storeroom inventory?'),
    ('f5f30d45-cf36-43a8-8b56-4c4a37d5a4f6', 'Will the new software be installed tonight or tomorrow?'),
    ('76cadad7-a16a-4819-be00-19a35ed7efdd', 'When do you need me to return the projector?'),
    ('d6dc7aa8-7efd-4b05-a3c7-901e4ccabb89', 'I don’t think we’ll need the large conference room.'),
    ('9aa0618d-b498-4650-b4e9-511dbcadc5ca', 'There’s going to be a coffee break, isn’t there?'),
    ('6f64a477-2ba0-4658-9aee-5c0e9a9aaaf3', 'Has next quarter’s budget been approved?'),
    ('13c2f922-9945-489a-8d9d-98a5c8e27eae', 'Do you like the new carpet in the lobby?'),
    ('3f874abb-9292-4626-9c5f-e83cec945436', 'We should go and get some lunch now.'),
    ('d76bbebd-5712-429f-ba52-80c377c09a26', 'Would you be interested in a magazine subscription?'),
    ('ef285393-2283-467f-9a4d-be2ab63dfeba', 'I don’t think Mr. Beck will like the new production plan.'),
    ('a8b97160-05c8-421c-a5b2-e6ba4ae26ae4', 'Shouldn’t we discuss the advertising campaign now?'),
    ('54c76057-6f82-474a-b659-8278eb81bd95', 'Where should I put this box of report binders?'),
    ('e2c322c8-859f-4df7-a8cd-ce43af6c8943', 'Have you seen our orientation video for new employees?'),
    ('785a2421-0d96-4bc2-ab27-993aa00f7e2f', 'When are you planning to take a vacation?'),
    ('60dad8fe-a7c2-4271-8f8a-91656439066a', 'M-Au: Why was this afternoon''s meeting canceled?
W-Br:'),
    ('44253bca-2160-47e0-a1b0-01871ca05fe0', 'W-Br: You use the company fitness center, don''t you?
M-Cn:'),
    ('289a231d-42de-4054-9d69-3d35c84dae72', 'W-Am: Do you have the images from the graphics department?
M-Au:'),
    ('11517cd8-62d3-4b52-8fa8-768821d0cb42', 'M-Cn: When are you moving to your new office?
W-Am:'),
    ('192a36df-e780-4133-b673-277828a59daa', 'W-Am: Would you like to sign up for the company retreat?
M-Au:'),
    ('229e65e3-d772-4b86-9576-f9bb3d34f816', 'M-Cn: How often do I have to submit my time sheet?
W-Br:'),
    ('224294f8-2cf0-4214-b869-966764618661', 'W-Br: I can buy a monthly gym membership, right?
M-Cn:'),
    ('9c18cf35-00b4-4d04-970f-fb8690e099c9', 'M-Au: Have you put price tags on all the clearance items?
W-Am:'),
    ('845263ba-c2a8-41fc-975f-40938dc4ed64', 'W-Br: Don''t we still need to change the newspaper layout?
M-Cn:'),
    ('583d8a50-289c-4c00-a8e6-c86b5d47b136', 'W-Br: What''s the total cost of the repair work?
W-Am:'),
    ('fc7c7dbe-1e07-4230-b7c8-6dfcdbd5c284', 'W-Am: Where can I get a new filing cabinet?
M-Au:'),
    ('21ee3a4d-5cc8-4502-8e40-fd4b8b5a8144', 'M-Cn: How do I reset my password?
W-Am:'),
    ('1845a855-e772-4d78-9b94-71155f1539a3', 'M-Au: Could you check to see if that monitor is plugged in?
M-Cn:'),
    ('c0fea29d-4f38-4bf3-9eae-63b6542c74c9', 'M-Cn: Is the new inventory process more efficient?
W-Br:'),
    ('10718aea-02c9-4835-80e5-61c7b10a4efe', 'M-Au: Would you like some ice cream or cake for dessert?
W-Am:'),
    ('d2543181-6287-4ce3-9c15-f95cc642063d', 'W-Br: Who''s doing the product demonstration this afternoon?
M-Au:'),
    ('3505285a-23ee-4bd3-a842-cd4314720542', 'M-Cn: Your presentation''s being reviewed at today''s managers'' meeting.
W-Br:'),
    ('ec3efd17-9144-4a80-9b90-96152f320995', 'W-Br: Don''t you carry these shoes in red?
M-Au:'),
    ('cd485093-65bc-4546-90a7-fee7df7ed80a', 'W-Am: Would you like to have lunch with the clients?
M-Cn:'),
    ('608242bd-f2c6-4e96-ad12-946c6982583a', 'M-Au: How about hiring an event planner to organize the holiday party?
W-Br:'),
    ('1d448596-ff2f-4b2b-9684-fa559afb0a07', 'M-Cn: Isn''t that carmaker planning to start exporting electric cars?
W-Am:'),
    ('e7687ee1-9ce3-4133-b79f-7b8ea3b8f740', 'W-Am: David trained the interns to use the company database, didn''t he?
M-Cn:'),
    ('1e8bb9a2-0777-41a1-9c79-57ceaf7acb5c', 'M-Au: Who''s responsible for researching the housing market in India?
W-Br:'),
    ('062b8b31-f1a6-44b2-9270-3f7b8061f975', 'W-Am: Have you arranged a ride to take us to the convention center, or should I?
M-Au:'),
    ('95c4e906-d210-4bec-b93e-c4717cf7a996', 'M-Cn: These purchases should have been entered on your expense report.
W-Br:'),
    ('27fa71f1-a129-4477-94c2-41b6a60b8edf', 'W-Br  Who approved the marketing budget?
M-Au'),
    ('7d4f442f-5a0c-46fc-be28-97f65c604a7f', 'W-Am  Where''s the employee break room?
M-Cn'),
    ('1ef2ea74-c765-430c-8bbe-792c59a74bf0', 'M-Au  When can we buy tickets?
W-Am'),
    ('509fe1db-f6a6-4c75-a53b-ac7ef3841dd6', 'W-Br  Would you be interested in joining our tour of the art museum?
M-Cn'),
    ('ca8a03de-f6f5-489f-940b-a1e9ee9b8fd4', 'M-Au  You have a copy of the report, don''t you?
M-Cn'),
    ('2fb46b81-e84e-4636-82f3-fb5e64cd8ee0', 'W-Am  How far are we from the hotel?
M-Au'),
    ('e939eb28-4fcf-489d-ac01-d090bba8c4f6', 'W-Br  Did you get a chance to read that document I sent you?
W-Am'),
    ('ee51be44-8d81-4ff0-90b1-c8dc582dcd46', 'M-Au  When will Mary return from the conference?
W-Br'),
    ('299270ea-8ca7-49ac-ab4d-d08b11b2b9b7', 'M-Cn  Should we take the train or a taxi to the town hall?
M-Au'),
    ('88c4b025-f64f-4765-9a5a-aaec6da854e1', 'W-Br  Haven''t you had your computer fixed yet?
M-Cn'),
    ('786173fb-babd-4168-810b-19d8cd331b00', 'W-Am  Why don''t you join us for lunch?
M-Cn'),
    ('98b12da1-fb77-4ece-aac9-f3feb5de9d21', 'M-Au  Do you like the new office space?
W-Am'),
    ('4d3c419f-5ca8-42f7-abeb-75e376eafae4', 'M-Au  Why did you cancel your visit to the doctor?
W-Br'),
    ('4bd58772-4865-4712-9287-d896d935d142', 'W-Am  How long has your house been listed for sale?
W-Br'),
    ('abc97b90-51b5-4e7e-885f-1a926305c200', 'W-Am  I''m surprised we haven''t received the product design yet.
M-Au'),
    ('e8fa50d5-8eda-4aad-9a64-6998fa97c152', 'M-Cn  What did you think of the social media seminar?
W-Am'),
    ('d7daa182-115c-43c3-a027-dd4f80486ab4', 'M-Au  Where would I be able to find Ms. Moreau this afternoon?
W-Br'),
    ('71186736-953d-45e9-a2ec-a6facfd97222', 'M-Cn  The new assembly plant''s hiring soon, isn''t it?
W-Am'),
    ('7ae6ec90-8ce7-4cf5-a764-b496e3fed4f8', 'W-Br  Aren''t we supposed to take the highway to the airport?
M-Au'),
    ('c32e4f4b-6c99-4e94-9a5c-382f9afa3faf', 'M-Cn  Do I sign for the delivery, or does someone else sign?
W-Am'),
    ('a936334a-a5b8-4487-9490-37cb2454b27f', 'W-Br  When will that company release its healthy snack bars?
M-Au'),
    ('288743fc-f53f-49eb-95f6-6f06da5ec407', 'M-Cn  The client called to say he''ll be late.
W-Br'),
    ('a5a77b4a-4cad-421e-a04b-3e0338a94242', 'M-Cn  How were the sales for our sports apparel this quarter?
W-Am'),
    ('ee89c4e7-5cee-4519-8e73-edab6d5bb3c9', 'W-Br  Are you buying a phone with a bigger screen or with better sound quality?
M-Cn'),
    ('bbee36f1-684a-4996-b99f-2c97dded4725', 'M-Au  Would you mind setting up the product displays?
W-Br'),
    ('82fd66a8-1da9-4c1a-89f4-d7f8576af552', 'W-Br: Where can I find the vice president''s office?
M-Cn:'),
    ('dca89e57-d879-44b8-b06b-b38b2be3fca4', 'W-Br: Which desk is mine?
M-Au:'),
    ('d7614458-a3ab-4e2c-be68-2d17a7457588', 'M-Cn: Who ordered the side salad?
M-Au:'),
    ('3511ef42-0cc9-4da8-90f9-1d1da3bac7c2', 'W-Am: Wasn''t Mr. Keller supposed to come to this business dinner?
M-Au:'),
    ('5e88fbbc-11a4-4bc4-ae56-9d928cd410b7', 'W-Br: When did they announce Barbara''s promotion to vice president?
M-Cn:'),
    ('fc1b2f17-78ec-4e17-aaf6-08b2ed4f01a6', 'W-Br: This is your first visit to this location, right?
M-Au:'),
    ('8f0a9a39-7472-4edf-8f1e-cec5bd5e288e', 'W-Am: Have you seen the new film at the cinema yet?
M-Cn:'),
    ('eafd3855-b447-4a14-9a33-0d704a568bcf', 'W-Am: Would you like to come to dinner with us later tonight?
M-Au:'),
    ('2a8b6496-13c0-45bb-8899-526c30553db4', 'M-Cn: Where did the accounting department move to?
W-Br:'),
    ('cc002612-e2b7-48a6-a5ad-e8fd07e0f66a', 'W-Am: How did the focus group respond to our new logo?
M-Cn:'),
    ('67a27e27-ec5d-4a6c-aab9-865a021984a5', 'M-Au: When does the reception start?
W-Br:'),
    ('92547396-dc8e-436a-8d3c-6062e0798db7', 'W-Br: Did you arrange to have the door repaired?
M-Cn:'),
    ('d95c7a93-f53c-47ef-89a8-5fed92d68e10', 'M-Cn: Why are production numbers so low this month?
W-Am:'),
    ('78ec3fc3-3442-4420-8551-2985424d4145', 'M-Cn: Do you mind if I leave early today?
W-Br:'),
    ('7c24075d-7371-48d0-91a4-1b81b15ba622', 'M-Au: Which software programs does Allison know how to use?
W-Am:'),
    ('bd5d9492-d3de-410c-be19-cc74af38f05e', 'M-Au: What does the conference registration fee include?
M-Cn:'),
    ('128bb757-e58f-481f-b102-3f7c3d456790', 'W-Br: Twenty people signed up for the team-building seminar.
M-Cn:'),
    ('33b18f9b-32b9-4392-906f-41be72a40235', 'M-Au: Can we begin production this week, or should we revise the timeline?
W-Br:'),
    ('6224721b-0a19-498f-9a5b-33f7a3492569', 'M-Cn: How are we marketing our new beverage to young people?
M-Au:'),
    ('84d212ea-d805-4366-8d1f-77206d697f48', 'W-Br: You really should join that new fitness club.
W-Am:'),
    ('22522207-603e-40d8-a0c9-599b658d8ac5', 'W-Br: Where can I get a laptop for our meeting?
M-Au:'),
    ('6bf9d257-e676-47f5-a2f2-5e22c8fe4e41', 'M-Au: Why do you want to sell your house?
W-Br:'),
    ('0fc149d1-6b5b-4f08-99ad-86dc9af49cb1', 'W-Br: I''m going to pick up the printing order now.
W-Am:'),
    ('2a36b250-c75f-49f8-913e-0b7e285dcac1', 'M-Cn: When is the new amusement park scheduled to open?
W-Am:'),
    ('8fbf4a77-8102-4629-b14d-d9f5a316958e', 'M-Cn: Do we have to submit our budget report on Friday, or is Monday OK?
W-Br:'),
    ('c9f1c135-4cde-4576-9edd-2c0cb8ec3afa', 'M-Au: What are your store hours today?
W-Br:'),
    ('87773d76-f233-4e95-9673-65da5f4f39c7', 'M-Cn: Would you like to see the doctor on Monday or Tuesday?
W-Br:'),
    ('bbf7fd1e-ff39-48ec-9993-7aeb8144e485', 'W-Am: Why is the training session shorter this time?
W-Br:'),
    ('8c23841a-04ba-4814-a1ee-0bb45c13413b', 'W-Am: Didn''t the owners of this restaurant open another location?
M-Cn:'),
    ('cdf7bf17-53d5-4dd7-ac28-8b2114390c3f', 'W-Br: I can buy a gift certificate for this store, right?
M-Au:'),
    ('8b478769-84ba-45c9-8eae-9f5ad378442f', 'M-Cn: What''s the average age of the residents in this apartment complex?
W-Am:'),
    ('86846fc1-df9c-476f-bcc0-47cecc0b20e8', 'M-Cn: When is the new-hire orientation taking place?
M-Au:'),
    ('b136b15b-3d21-418b-a90f-fb2de5b0463d', 'W-Br: Why did your manager move to a different office?
M-Au:'),
    ('47444192-9d7e-4b72-b6f4-8eb48bb4d0c5', 'W-Am: Will you be at the meeting in the afternoon?
W-Br:'),
    ('b941f700-57d0-4ca2-bd64-af90ce920ed7', 'M-Cn: When will we know if the project received funding?
M-Au:'),
    ('d08b118c-a971-4410-a82b-e20da1e6d5ae', 'W-Am: Do you have the sales report ready?
W-Br:'),
    ('f1da387b-81d1-4563-b8a7-1600d892a93b', 'M-Au: You received the payment that I submitted, right?
M-Cn:'),
    ('8f4e7f72-a97e-440b-b894-33548ff250e5', 'W-Am: How many people are joining us for dinner?
M-Cn:'),
    ('6194147a-9466-4b17-9fcc-c200704ed2e7', 'M-Cn: When will the air-conditioning be fixed?
W-Am:'),
    ('e50f5f38-f5ef-4f94-a555-38e82fb6d8d3', 'M-Cn: Where should I put this display of books?
W-Br:'),
    ('6bf64aaa-a43c-41f6-a0b2-2c0cd7fc5fde', 'W-Am: Who ordered more printer paper?
M-Au:'),
    ('fa14239c-2440-4aff-9438-413fd78e472f', 'M-Cn: It''s usually cheaper to buy airplane tickets in advance.
M-Au:'),
    ('c7440dd7-0aed-4557-af81-07036e8154be', 'W-Am: Can we pay for the new printer with the company credit card?
M-Cn:'),
    ('f4917c60-99e9-499e-aedd-151f313cfa50', 'M-Au: Isn''t the number of jobs in this area increasing?
W-Am:'),
    ('2c747a4c-de89-417a-8b3d-e60f959e0a3f', 'M-Cn: May I speak with Mr. Kumar?
W-Am:'),
    ('07b3a0d2-c4d2-4f02-a935-285819b4b745', 'W-Br: Where are the free samples of the bakery''s new cupcakes?
M-Au:'),
    ('114da531-a4d1-4e75-a42b-394ff488ee31', 'M-Cn: I need someone to help me update next week''s schedule.
W-Br:'),
    ('18007faf-ba96-43fe-b4a0-78e157a08c68', 'M-Au: Who would like to attend the museum opening tomorrow?
W-Br:'),
    ('e5555365-2689-4144-be90-54f483bc5e10', 'W-Br: Would you mind helping me clean the break room?
M-Au:'),
    ('afeae0d8-9a3d-4350-8ab2-6c3bb434d0d4', 'M-Cn: The singer in that band is great.
W-Am:');

DROP TEMPORARY TABLE IF EXISTS migration_part2_question_text_guard_20260811;
CREATE TEMPORARY TABLE migration_part2_question_text_guard_20260811 (
    validation_ok TINYINT NOT NULL,
    CONSTRAINT chk_migration_part2_text_validation CHECK (validation_ok = 1)
) ENGINE=InnoDB;

-- Abort before updating if the canonical payload does not match the target dataset.
SELECT COUNT(*) INTO @part2_payload_count
FROM migration_part2_question_text_20260811;

SELECT COUNT(*) INTO @part2_matched_count
FROM migration_part2_question_text_20260811 source
INNER JOIN questions question ON question.id = source.question_id;

SELECT COUNT(*) INTO @part2_wrong_part_count
FROM migration_part2_question_text_20260811 source
INNER JOIN questions question ON question.id = source.question_id
WHERE question.part <> 2;

INSERT INTO migration_part2_question_text_guard_20260811 (validation_ok)
VALUES (
    @part2_payload_count = 1875
    AND @part2_matched_count = 1875
    AND @part2_wrong_part_count = 0
);

START TRANSACTION;

UPDATE questions question
INNER JOIN migration_part2_question_text_20260811 source
    ON source.question_id = question.id
SET question.question_text = source.question_text
WHERE question.part = 2 AND (question.question_text IS NULL OR TRIM(question.question_text) = '');

SET @part2_question_text_rows_updated = ROW_COUNT();

-- A failed post-update check aborts the client before COMMIT.
INSERT INTO migration_part2_question_text_guard_20260811 (validation_ok)
SELECT (COUNT(*) = 0)
FROM questions question
INNER JOIN migration_part2_question_text_20260811 source ON source.question_id = question.id
WHERE question.part = 2 AND (question.question_text IS NULL OR TRIM(question.question_text) = '');

COMMIT;

SELECT 'part2_question_text_rows_updated' AS metric, @part2_question_text_rows_updated AS value
UNION ALL
SELECT 'remaining_missing_part2_question_text', COUNT(*)
FROM questions question
INNER JOIN migration_part2_question_text_20260811 source ON source.question_id = question.id
WHERE question.part = 2 AND (question.question_text IS NULL OR TRIM(question.question_text) = '');

DROP TEMPORARY TABLE migration_part2_question_text_guard_20260811;
DROP TEMPORARY TABLE migration_part2_question_text_20260811;

