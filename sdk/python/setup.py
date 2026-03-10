from setuptools import setup, find_packages

setup(
    name='feishu-notifier',
    version='1.0.0',
    description='Python SDK for Feishu AI Notifier',
    author='Your Name',
    author_email='your-email@example.com',
    url='https://github.com/yourusername/vscode-ai-feishu-bot',
    packages=find_packages(),
    python_requires='>=3.7',
    install_requires=[
        'requests>=2.25.0',
    ],
    classifiers=[
        'Development Status :: 5 - Production/Stable',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
    ],
)
