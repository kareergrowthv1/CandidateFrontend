/**
 * Shared dummy resume data used for template previews and thumbnails.
 * Single source of truth — import this wherever a preview/thumbnail is needed.
 */
const RESUME_DUMMY_DATA = {
    personal_info: {
        full_name: 'Alex Johnson',
        profession: 'Software Engineer',
        email: 'alex@example.com',
        phone: '+1 555 123 4567',
        location: 'New York, NY',
        linkedin: 'https://www.linkedin.com/in/alexj',
        github: 'https://github.com/alexj',
        facebook: '',
        instagram: '',
        website: 'https://alexjohnson.dev',
        image: null,
    },
    professional_summary:
        'Experienced software engineer with 5+ years building scalable web applications. ' +
        'Passionate about clean code, developer experience, and shipping quality products.',
    experience: [
        {
            company: 'TechCorp Inc.',
            position: 'Senior Software Engineer',
            location: 'New York, NY',
            project_title: 'Microservices Migration',
            project_link: 'https://github.com/techcorp/microservices',
            start_date: '2021-03',
            end_date: null,
            is_current: true,
            description:
                'Led architecture of microservices platform handling 10M daily requests.\n' +
                'Mentored 4 junior engineers and drove adoption of TypeScript across the team.',
        },
        {
            company: 'Startup Labs',
            position: 'Full Stack Developer',
            location: 'San Francisco, CA',
            project_title: '',
            project_link: '',
            start_date: '2019-06',
            end_date: '2021-02',
            is_current: false,
            description:
                'Built and shipped 3 B2B SaaS products from scratch using React and Node.js.\n' +
                'Reduced API response times by 40% via query optimization and Redis caching.',
        },
    ],
    education: [
        {
            institution: 'State University',
            location: 'New York',
            degree: 'B.S.',
            field: 'Computer Science',
            start_date: '2015-08',
            graduation_date: '2019-05',
            gpa: '3.8',
            description: 'Dean\'s List all 4 years, graduated with honors.\nRelevant coursework: Data Structures, Algorithms, Operating Systems, Distributed Computing.',
        },
    ],
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'GraphQL'],
    skillGroups: [
        { category: 'Backend',         skills: ['Java', 'Spring Boot', 'Spring Security', 'RESTful APIs', 'JPA', 'Hibernate'] },
        { category: 'Frontend',        skills: ['React.js', 'TypeScript', 'Tailwind CSS', 'HTML5', 'CSS3'] },
        { category: 'Database',        skills: ['MySQL', 'PostgreSQL', 'MongoDB'] },
        { category: 'Cloud & Tools',   skills: ['AWS', 'Git', 'GitHub', 'Swagger', 'Postman'] },
        { category: 'Concepts',        skills: ['Microservices', 'System Design', 'JWT Authentication', 'Agile', 'AI/ML Integration'] },
    ],
    project: [
        {
            name: 'OpenDash',
            link: 'https://github.com/alexj/opendash',
            description: 'Developer analytics dashboard built with Next.js and D3.js.',
            bullets: '2k+ GitHub stars and 500+ weekly active users.\nIntegrated with GitHub, Jira, and Slack APIs.\nDeployed on AWS with CI/CD via GitHub Actions.',
        },
    ],
    certificates: [
        { title: 'AWS Solutions Architect', issuer: 'Amazon Web Services', link: 'https://aws.amazon.com/certification/', date: '2022-08', description: 'Covers cloud architecture, security, and deployment best practices on AWS.' },
    ],
    achievements: [
        { title: 'Best Hack — HackNY 2020', date: '2020-03', description: '' },
    ],
    languages: ['English', 'Spanish'],
    hobbies: ['Open source', 'Rock climbing', 'Photography'],
};

export default RESUME_DUMMY_DATA;
