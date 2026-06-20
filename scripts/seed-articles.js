#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Article = require('../src/models/Article');
const Exercise = require('../src/models/Exercise');
const { analyzeDifficulty } = require('../src/services/difficulty-analyzer');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eng-reader';

const ARTICLES = [
  // ===== A1 (3篇) =====
  { title: 'My Daily Routine', difficulty: 'A1', category: 'life', tags: ['daily', 'routine'],
    content: `I wake up at seven o'clock every morning. First, I brush my teeth and wash my face. Then I eat breakfast. I usually have bread and milk.

After breakfast, I go to school. I walk to school with my friend. It takes about ten minutes. School starts at eight thirty.

I have four classes in the morning. My favorite class is English. At twelve o'clock, I eat lunch at school.

In the afternoon, I have two more classes. After school, I go home and do my homework. In the evening, I watch TV or read a book. I go to bed at nine o'clock.

I like my daily routine. It is simple and happy.`,
    source: 'English Learning' },
  { title: 'At the Supermarket', difficulty: 'A1', category: 'life', tags: ['shopping', 'food'],
    content: `Tom goes to the supermarket with his mother. They need to buy food for the week.

First, they go to the fruit section. Tom likes apples and bananas. His mother buys some oranges too.

Then they go to the vegetable section. They buy carrots, tomatoes, and potatoes. Tom's mother also buys some lettuce.

Next, they go to the meat section. They buy chicken and fish. Tom does not like fish, but his mother says it is healthy.

Finally, they go to the drinks section. Tom wants some juice. His mother buys milk and water.

At the checkout, they pay fifty dollars. Tom helps his mother carry the bags home. They are both tired but happy.`,
    source: 'Easy English' },
  { title: 'My Family', difficulty: 'A1', category: 'life', tags: ['family', 'people'],
    content: `My name is Lisa. I am ten years old. I live with my family in a small house.

My father is a doctor. He works at a hospital. He is tall and has brown hair. He likes to read books.

My mother is a teacher. She teaches at a primary school. She is very kind. She likes to cook delicious food.

I have one brother. His name is David. He is seven years old. He goes to the same school as me. He likes to play football.

We also have a pet cat. Her name is Mimi. She is white and very cute. She likes to sleep on the sofa.

I love my family very much. We are always happy together.`,
    source: 'Kids English' },

  // ===== A2 (4篇) =====
  { title: 'A Trip to the Beach', difficulty: 'A2', category: 'life', tags: ['travel', 'beach', 'holiday'],
    content: `Last summer, my family went to the beach for a holiday. We drove for three hours to get there. The weather was sunny and hot.

When we arrived, I was very excited. The sea was blue and beautiful. The sand was warm under my feet.

My brother and I ran to the water immediately. The waves were big and fun. We played in the sea for a long time. My mother sat under an umbrella and read a book. My father took many photos.

At lunchtime, we ate sandwiches on the beach. The food tasted very good outside. After lunch, I built a big sandcastle. My brother helped me.

In the afternoon, we walked along the beach. We found some beautiful shells. I put them in my bag to take home.

We stayed until sunset. The sky turned orange and pink. It was the most beautiful sunset I had ever seen. I wanted to stay forever.`,
    source: 'Travel Stories' },
  { title: 'Learning to Cook', difficulty: 'A2', category: 'life', tags: ['cooking', 'food', 'learning'],
    content: `Last month, I decided to learn how to cook. I wanted to make a special dinner for my parents.

First, I watched some videos on the internet. I chose a simple recipe: pasta with tomato sauce. It looked easy enough.

I went to the supermarket and bought all the ingredients. I needed pasta, tomatoes, onions, garlic, and cheese.

At home, I started cooking. I cut the onions and garlic first. Then I cooked them in a pan with some oil. The smell was wonderful.

Next, I added the tomatoes and cooked them for twenty minutes. Meanwhile, I boiled the pasta in another pot.

When everything was ready, I put the pasta on plates and added the sauce. I also put some cheese on top.

My parents were very surprised when they came home. They tasted the pasta and said it was delicious. I was so proud of myself!

Now I want to learn more recipes. Cooking is fun and useful.`,
    source: 'Life Skills' },
  { title: 'The School Sports Day', difficulty: 'A2', category: 'life', tags: ['school', 'sports', 'competition'],
    content: `Last Friday was our school sports day. All the students were very excited.

The day started with a running race. My friend Jack was very fast. He won the race and got a gold medal. I came in third place and got a bronze medal.

After the running race, there was a long jump competition. I jumped 3.5 meters. It was not bad for my first time.

Then there was a football match between Class A and Class B. The game was very exciting. Class A won 3-2. Everyone cheered loudly.

At lunchtime, we had a picnic on the school field. The teachers prepared sandwiches and juice for everyone.

In the afternoon, there was a tug of war. Our class competed against Class C. We pulled very hard and won! Everyone was very happy.

The sports day finished at four o'clock. We were all tired but had a great time. I hope next year's sports day will be even better.`,
    source: 'School Life' },
  { title: 'My Favorite Animal', difficulty: 'A2', category: 'science', tags: ['animals', 'nature'],
    content: `My favorite animal is the dolphin. Dolphins are very intelligent and friendly animals.

Dolphins live in the ocean. They can be found in many parts of the world. They like warm water best.

Dolphins are mammals, not fish. They breathe air like humans do. They come to the surface of the water to breathe.

Dolphins are very social animals. They live in groups called pods. A pod can have ten to thirty dolphins. They talk to each other using special sounds.

Dolphins are also very playful. They like to jump out of the water and play with each other. Sometimes they even play with other animals.

Dolphins eat fish and squid. They use echolocation to find their food. This means they send out sounds and listen for the echoes.

Dolphins are very friendly to humans. Sometimes they swim near boats and surfers. Many people love dolphins because they are smart and beautiful.`,
    source: 'Nature World' },

  // ===== B1 (4篇) =====
  { title: 'The Power of Music', difficulty: 'B1', category: 'life', tags: ['music', 'health', 'brain'],
    content: `Music is an important part of human culture. People have been making music for thousands of years. Today, music is everywhere: on the radio, in movies, and on our phones.

But did you know that music is also good for your health? Scientists have discovered that listening to music can reduce stress and anxiety. When we listen to music we enjoy, our brains release a chemical called dopamine. This makes us feel happy and relaxed.

Music can also help us study and work better. Many students listen to music while doing homework. Studies show that certain types of music, like classical music, can improve concentration and memory.

Learning to play a musical instrument is even better for the brain. It improves coordination, creativity, and problem-solving skills. Children who play instruments often do better in school.

Music can also bring people together. Concerts and music festivals are popular around the world. People from different countries can enjoy the same songs, even if they don't speak the same language.

So next time you listen to your favorite song, remember: you're not just having fun. You're also taking care of your brain and your health.`,
    source: 'Health & Science' },
  { title: 'Working from Home', difficulty: 'B1', category: 'business', tags: ['work', 'remote', 'technology'],
    content: `In recent years, more and more people have started working from home. This trend grew especially fast during the pandemic. Now, many companies allow their employees to work remotely.

Working from home has many advantages. First, you don't need to commute. This saves time and money. You also don't need to worry about traffic jams or crowded trains. Second, you can create a comfortable workspace. You can wear comfortable clothes and play your own music. Third, you have more flexibility with your schedule. You can take breaks when you need them.

However, working from home also has some disadvantages. Some people find it hard to separate work from personal life. When your home is your office, it's difficult to "switch off." This can lead to working too much and feeling tired.

Another problem is loneliness. When you work from home, you don't see your colleagues every day. You might miss the social interaction and team spirit.

To work from home successfully, experts suggest having a dedicated workspace. It's also important to set a regular schedule and take regular breaks. Video calls can help you stay connected with your team.

Whether you work from home or in an office, the most important thing is to find a balance that works for you.`,
    source: 'Business Weekly' },
  { title: 'The History of the Internet', difficulty: 'B1', category: 'tech', tags: ['internet', 'history', 'technology'],
    content: `The internet has changed the world in many ways. But where did it come from?

The internet started in the 1960s as a project by the US military. It was called ARPANET. The goal was to create a network that could survive a nuclear attack. Only a few computers were connected at first.

In the 1970s and 1980s, universities and research centers began using the network. Scientists used it to share data and communicate with each other. The network grew slowly but steadily.

The big change came in 1991, when Tim Berners-Lee invented the World Wide Web. This made the internet much easier to use. Instead of typing complicated commands, people could click on links and visit websites.

In the 1990s, the internet became available to ordinary people. The first popular web browsers made it easy to explore the online world. Email became a common way to communicate.

By the 2000s, the internet had become a part of daily life. Social media, online shopping, and video streaming changed how we live and work.

Today, more than five billion people use the internet. It connects people across the world and provides access to information, education, and entertainment.

The internet continues to evolve. New technologies like artificial intelligence and virtual reality are shaping its future.`,
    source: 'Tech History' },
  { title: 'Healthy Eating Habits', difficulty: 'B1', category: 'science', tags: ['health', 'food', 'nutrition'],
    content: `Eating healthy food is important for our bodies and minds. But with so much information about diet and nutrition, it can be confusing to know what to eat.

Experts say that a balanced diet is the key to good health. This means eating a variety of foods from different groups: fruits, vegetables, whole grains, protein, and dairy.

Fruits and vegetables should make up a large part of your diet. They are rich in vitamins, minerals, and fiber. Experts recommend eating at least five servings of fruits and vegetables every day.

Whole grains like brown rice, whole wheat bread, and oats are better than refined grains. They contain more nutrients and fiber, which help you feel full longer.

Protein is essential for building and repairing muscles. Good sources include fish, chicken, beans, and nuts. Try to eat fish at least twice a week.

It's also important to limit certain foods. Too much sugar can lead to weight gain and tooth problems. Too much salt can increase blood pressure. Processed foods often contain high levels of both.

Drinking enough water is also crucial. The average person should drink about eight glasses of water a day. Water helps your body function properly and keeps your skin healthy.

Remember, healthy eating doesn't mean you can never enjoy your favorite treats. The key is moderation. A piece of cake now and then is perfectly fine as part of an overall balanced diet.`,
    source: 'Health Guide' },

  // ===== B2 (4篇) =====
  { title: 'The Future of Space Travel', difficulty: 'B2', category: 'science', tags: ['space', 'technology', 'future'],
    content: `Space travel has always captured the human imagination. From the first moon landing in 1969 to the International Space Station, we have made incredible progress. But what does the future hold?

Private companies like SpaceX and Blue Origin are leading a new era of space exploration. SpaceX's Starship rocket is designed to carry humans to Mars. The company's goal is to establish a permanent human settlement on the Red Planet within the next few decades.

NASA is also planning ambitious missions. The Artemis program aims to return humans to the Moon and build a permanent lunar base. This base could serve as a stepping stone for missions to Mars and beyond.

Space tourism is becoming a reality too. Several companies now offer suborbital flights for civilians. While these trips are expensive, prices are expected to decrease over time. In the future, space tourism could become as common as air travel.

However, space travel faces significant challenges. Radiation exposure is a major concern for long-duration missions. The effects of microgravity on the human body are also not fully understood. Astronauts can experience muscle loss, bone density reduction, and vision problems.

Another challenge is the psychological impact of long space missions. Travelers to Mars would spend months in a small spacecraft with the same group of people. Managing stress and maintaining mental health would be crucial.

Despite these challenges, the future of space travel looks promising. With continued investment and innovation, humans may become a multi-planetary species within our lifetime.`,
    source: 'Science Today' },
  { title: 'Climate Change and Cities', difficulty: 'B2', category: 'science', tags: ['climate', 'cities', 'environment'],
    content: `Cities around the world are feeling the effects of climate change. Rising temperatures, extreme weather events, and sea-level rise pose serious challenges for urban areas.

Heat waves are becoming more frequent and intense. Cities are especially vulnerable because of the "urban heat island" effect. Concrete, asphalt, and buildings absorb and retain heat, making cities several degrees warmer than surrounding rural areas. This can be dangerous for elderly and vulnerable residents.

Flooding is another major concern. Many cities are located near coasts or rivers. As sea levels rise and storms become more intense, the risk of flooding increases. Cities like Miami, Jakarta, and Mumbai are already experiencing more frequent flooding.

Air quality is also affected by climate change. Higher temperatures can increase ground-level ozone, which is harmful to breathe. This is particularly problematic for people with respiratory conditions like asthma.

To address these challenges, cities are adopting various strategies. Green infrastructure, such as parks, green roofs, and urban forests, can help reduce the heat island effect and improve air quality. Some cities are investing in better drainage systems to manage flooding.

Transportation is another key area. Many cities are promoting public transit, cycling, and walking to reduce emissions. Electric vehicles and charging infrastructure are also being expanded.

Building codes are being updated to make structures more resilient to extreme weather. New buildings are designed to be more energy-efficient and better insulated.

While the challenges are significant, cities have the opportunity to lead the way in addressing climate change. By adopting innovative solutions, urban areas can become more sustainable and resilient.`,
    source: 'Environmental Review' },
  { title: 'The Psychology of Social Media', difficulty: 'B2', category: 'science', tags: ['psychology', 'social media', 'mental health'],
    content: `Social media has become an integral part of modern life. Billions of people use platforms like Instagram, TikTok, and Twitter every day. But how does social media affect our mental health?

One of the most studied effects is social comparison. When we see carefully curated posts showing others' best moments, we often compare ourselves unfavorably. This can lead to feelings of inadequacy, jealousy, and low self-esteem. Studies have found a link between heavy social media use and increased rates of depression and anxiety.

The design of social media platforms also plays a role. Features like "likes," "shares," and notifications trigger dopamine releases in the brain. This creates a reward system similar to gambling. Users can become addicted to checking their phones for new notifications.

Sleep quality is another concern. Many people use their phones before bed, and the blue light from screens can interfere with sleep patterns. The constant stimulation of social media can also make it difficult to relax and fall asleep.

However, social media also has positive aspects. It allows people to stay connected with friends and family, especially those who live far away. It can provide support communities for people with shared experiences or challenges. It also offers opportunities for learning and creativity.

For young people, social media can be particularly impactful. While it helps them connect with peers, it can also expose them to cyberbullying and unrealistic standards. Parents and educators play an important role in helping young people develop healthy social media habits.

Experts recommend setting boundaries around social media use. This includes limiting screen time, turning off notifications, and being mindful of how social media makes you feel. Taking regular breaks from social media can also be beneficial.`,
    source: 'Psychology Today' },
  { title: 'The Rise of Electric Vehicles', difficulty: 'B2', category: 'tech', tags: ['electric cars', 'technology', 'environment'],
    content: `Electric vehicles are rapidly changing the automotive industry. What was once a niche market is now becoming mainstream, with major car manufacturers investing billions in electric technology.

The benefits of electric vehicles are clear. They produce zero direct emissions, which helps reduce air pollution in cities. They are also cheaper to operate than gasoline cars. Electricity costs less than gasoline, and electric motors require less maintenance than combustion engines.

Battery technology has improved significantly in recent years. Modern electric cars can travel 300 to 400 kilometers on a single charge. Charging infrastructure is also expanding rapidly. Many countries are building networks of fast-charging stations along highways.

Government policies are accelerating the transition. Several countries have announced bans on new gasoline car sales within the next decade. Tax incentives and subsidies make electric vehicles more affordable for consumers.

However, challenges remain. The initial cost of electric vehicles is still higher than comparable gasoline cars, though prices are decreasing. Range anxiety—the fear of running out of battery—continues to concern some drivers.

The environmental impact of battery production is another consideration. Mining lithium and other materials used in batteries can have significant environmental consequences. However, research into recycling and alternative battery materials is progressing.

The electricity used to charge electric vehicles also matters. In regions where electricity comes primarily from fossil fuels, the environmental benefits are reduced. The growth of renewable energy sources is therefore closely linked to the success of electric vehicles.

Despite these challenges, the future of electric transportation looks bright. As technology improves and costs decrease, electric vehicles are likely to become the dominant form of personal transportation.`,
    source: 'Tech Review' },

  // ===== C1 (3篇) =====
  { title: 'The Ethics of Artificial Intelligence', difficulty: 'C1', category: 'tech', tags: ['AI', 'ethics', 'society'],
    content: `Artificial intelligence is transforming every aspect of society, from healthcare and education to finance and criminal justice. As AI systems become more powerful and pervasive, they raise profound ethical questions that demand careful consideration.

One of the most pressing concerns is algorithmic bias. AI systems learn from data, and if that data reflects historical biases, the AI will perpetuate and even amplify them. This has been documented in facial recognition systems that perform poorly on people with darker skin tones, and in hiring algorithms that discriminate against women. Addressing bias requires diverse development teams, careful data curation, and ongoing monitoring.

Privacy is another critical issue. AI systems often require vast amounts of data to function effectively. This data may include sensitive personal information. The collection, storage, and use of this data raise questions about consent, transparency, and individual rights. The European Union's GDPR represents one attempt to regulate data use, but enforcement remains challenging.

The impact on employment is perhaps the most debated topic. While AI can automate routine tasks and increase productivity, it also threatens to displace workers in many industries. The World Economic Forum estimates that AI will create 97 million new jobs by 2025, but it will also eliminate 85 million existing ones. Managing this transition will require significant investment in education and retraining programs.

Autonomous weapons represent perhaps the most alarming application of AI. The prospect of machines making life-or-death decisions without human intervention raises fundamental questions about accountability and the laws of war. Many organizations are calling for international regulations to govern the development and use of autonomous weapons.

The question of AI consciousness and rights is also emerging. As AI systems become more sophisticated, some researchers argue that they may eventually develop forms of consciousness. If that happens, society will need to reconsider what it means to have rights and moral status.

Navigating these ethical challenges requires collaboration between technologists, policymakers, ethicists, and the public. The decisions we make today about AI governance will shape the future of human civilization.`,
    source: 'Ethics & Technology' },
  { title: 'Global Migration Patterns', difficulty: 'C1', category: 'life', tags: ['migration', 'society', 'global'],
    content: `Migration has been a constant throughout human history, but the scale and complexity of modern migration are unprecedented. According to the United Nations, approximately 280 million people live outside their country of birth. Understanding the forces that drive migration and its consequences is crucial for policymakers and societies worldwide.

Economic opportunity remains the primary driver of migration. People move from poorer to richer countries in search of better jobs, higher wages, and improved living standards. This benefits both sending and receiving countries in many ways. Migrants send remittances to their families, which can be a significant source of income for developing nations. In receiving countries, migrants often fill labor shortages and contribute to economic growth.

Conflict and persecution force millions to flee their homes. The number of refugees worldwide has exceeded 35 million, the highest level since World War II. The Syrian civil war, the conflict in Ukraine, and instability in various African nations have created massive displacement crises. Host countries face the challenge of providing shelter, food, and services to large numbers of refugees.

Climate change is emerging as a significant driver of migration. Rising sea levels, extreme weather events, and changing agricultural conditions are forcing people to relocate. The World Bank estimates that by 2050, climate change could create 216 million internal migrants. Small island nations face the existential threat of complete submersion.

The integration of migrants into host societies presents both opportunities and challenges. Successful integration requires access to education, employment, healthcare, and social services. Cultural differences can create tensions, but they can also enrich societies through diversity.

Migration policies vary widely across countries. Some nations have adopted welcoming policies, while others have tightened border controls and restricted immigration. Finding the right balance between security concerns and humanitarian obligations remains a central challenge.

The future of migration will be shaped by demographic trends, economic conditions, and climate change. Aging populations in developed countries may increase demand for migrant workers, while climate change may create new patterns of displacement. Effective governance of migration will be essential for global stability and prosperity.`,
    source: 'Global Affairs' },
  { title: 'The Neuroscience of Learning', difficulty: 'C1', category: 'science', tags: ['neuroscience', 'learning', 'brain'],
    content: `Understanding how the brain learns has been one of the most fascinating areas of neuroscience research. Advances in brain imaging technology have revealed the remarkable complexity of the learning process and have important implications for education and personal development.

At the cellular level, learning involves changes in the connections between neurons, known as synapses. When we learn something new, neurons that fire together strengthen their connections. This principle, known as Hebb's rule, is often summarized as "neurons that fire together, wire together." Repeated practice strengthens these connections, making the learned skill or knowledge more durable.

Memory formation involves multiple brain regions. The hippocampus plays a crucial role in converting short-term memories into long-term ones. The prefrontal cortex is involved in working memory and executive function. Different types of information are stored in different areas: visual information in the occipital lobe, language in temporal and frontal regions, and motor skills in the cerebellum.

Sleep plays a vital role in learning and memory consolidation. During sleep, the brain replays the day's experiences, strengthening important neural connections and pruning unnecessary ones. Studies have shown that people who sleep after learning perform better on tests than those who stay awake. This has important implications for students and professionals.

Neuroplasticity—the brain's ability to reorganize itself—was once thought to be limited to childhood. We now know that the brain remains plastic throughout life, though its capacity for change does decrease with age. This means that learning new skills is possible at any age, though it may require more effort and practice.

Stress and emotions significantly affect learning. Moderate stress can enhance memory formation, but chronic stress can impair cognitive function. The amygdala, which processes emotions, can either enhance or interfere with learning depending on the context. Positive emotions generally facilitate learning, while anxiety and fear can create barriers.

These insights have practical implications for education. Active learning, spaced repetition, and adequate sleep are more effective than passive study and cramming. Understanding individual differences in learning styles and brain organization can help create more personalized and effective educational approaches.`,
    source: 'Brain Research' },

  // ===== C2 (2篇) =====
  { title: 'The Paradox of Choice in Modern Society', difficulty: 'C2', category: 'life', tags: ['psychology', 'society', 'philosophy'],
    content: `In his seminal work "The Paradox of Choice," psychologist Barry Schwartz argues that an abundance of options, far from increasing happiness, can actually diminish it. This counterintuitive thesis has profound implications for consumer culture, public policy, and our understanding of human well-being.

The modern marketplace offers an unprecedented variety of products and services. A typical supermarket stocks over 30,000 items. Online retailers offer millions of products. Streaming services provide access to thousands of movies and television shows. While this abundance seems desirable, research suggests that it can lead to decision paralysis, anxiety, and regret.

Schwartz distinguishes between "maximizers" and "satisficers." Maximizers exhaustively research all options before making a decision, always seeking the best possible choice. Satisficers, on the other hand, set a threshold of acceptability and choose the first option that meets it. Studies show that satisficers tend to be happier with their decisions, even when maximizers objectively make better ones.

The phenomenon extends beyond consumer choices. Career options, relationship possibilities, and lifestyle choices have all expanded dramatically. While this freedom is valuable, it can also create overwhelming pressure to make the "right" choice. The fear of missing out (FOMO) and constant social comparison exacerbate this anxiety.

The implications for public policy are significant. Some researchers argue that governments should use "nudges"—subtle changes in how choices are presented—to help people make better decisions without restricting freedom. Automatic enrollment in retirement savings plans, for example, dramatically increases participation rates.

The paradox of choice also raises deeper philosophical questions about the nature of freedom and happiness. Is more choice always better? Does freedom of choice necessarily lead to fulfillment? The answers may depend on cultural context, individual personality, and the specific domain of choice.

Finding a balance between freedom and simplicity is one of the central challenges of modern life. By understanding the psychology of choice, individuals and societies can create environments that promote genuine well-being rather than endless deliberation.`,
    source: 'Philosophy & Psychology' },
  { title: 'The Evolution of Language in the Digital Age', difficulty: 'C2', category: 'life', tags: ['language', 'digital', 'culture'],
    content: `The digital revolution has profoundly transformed the way humans communicate, and with it, the nature of language itself. From emojis and abbreviations to memes and viral phrases, digital communication has spawned entirely new forms of linguistic expression that challenge traditional notions of grammar, meaning, and literacy.

The constraints of early digital communication—limited character counts, slow typing on numeric keypads—gave rise to abbreviations and shorthand: "LOL," "BRB," "OMG." While prescriptivists initially dismissed these as evidence of linguistic decline, linguists now recognize them as creative adaptations to new communicative contexts. These forms serve pragmatic functions, conveying tone, emotion, and social meaning that text alone cannot capture.

Emojis represent perhaps the most significant innovation in digital language. These small pictographs function as a quasi-universal language, transcending linguistic barriers. Research shows that emojis activate the same brain regions as facial expressions, suggesting they serve a similar communicative function. They can modify the tone of a message, express emotions, and even replace words entirely.

Memes constitute a unique form of cultural communication. Combining images, text, and shared cultural knowledge, memes create meaning through intertextuality and remix. They can convey complex ideas, social commentary, and humor in formats that spread rapidly across digital networks. Understanding memes requires not just linguistic competence but cultural literacy.

The speed of linguistic change has accelerated dramatically in the digital age. New words and phrases can spread globally within hours. "Ghosting," "catfishing," and "doomscrolling" entered common usage almost overnight. This rapid evolution reflects the dynamic nature of language and its responsiveness to social change.

However, digital language also raises concerns about linguistic equity and access. Those unfamiliar with digital conventions may be excluded from certain forms of communication. The dominance of English in digital spaces can marginalize other languages and cultures.

The future of language in the digital age will be shaped by technological developments, cultural trends, and social needs. As artificial intelligence becomes more sophisticated in processing and generating language, the boundaries between human and machine communication may blur. Whatever the future holds, one thing is certain: language will continue to evolve, adapt, and surprise us.`,
    source: 'Linguistics Review' },
];

async function main() {
  console.log(`连接 MongoDB: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB 已连接\n');

  const existing = await Article.countDocuments();
  if (existing >= 20) {
    console.log(`已有 ${existing} 篇文章，跳过`);
    await mongoose.disconnect();
    return;
  }

  let imported = 0;
  for (const data of ARTICLES) {
    try {
      const analysis = analyzeDifficulty(data.content);
      const article = await Article.create({
        ...data,
        wordCount: analysis.wordCount,
        readingTimeMin: analysis.readingTimeMin,
        isPublished: true,
      });

      // 配套练习题
      await Exercise.create({
        articleId: article._id,
        questions: [
          { type: 'multiple-choice', text: `What is the main topic of "${article.title}"?`, options: [article.tags[0] || 'Topic A', 'Unrelated topic', 'Another topic', 'None of the above'], answer: article.tags[0] || 'Topic A', explanation: `文章主要讨论了${article.tags[0]}。` },
          { type: 'true-false', text: `The article suggests that ${article.tags[0]} is important.`, options: ['True', 'False'], answer: 'True', explanation: '文章表达了这一观点。' },
          { type: 'fill-blank', text: `The difficulty level of this article is ___.`, options: [], answer: article.difficulty, explanation: `本文章难度为 ${article.difficulty}。` },
        ],
      });

      imported++;
      console.log(`✓ [${article.difficulty}] ${article.title} (${article.wordCount}词)`);
    } catch (err) {
      console.error(`✗ ${data.title}: ${err.message}`);
    }
  }

  console.log(`\n导入完成: ${imported} 篇`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err.message); process.exit(1); });
