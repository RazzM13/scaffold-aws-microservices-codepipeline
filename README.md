# A simplistic vanilla pipeline for building and deploying microservices on the AWS technology stack.

# TOC:
* [Features](#features)
* [Overview](#overview)
* [Installation](#installation)
* [Stacks](#stacks)
* [Stages](#stages)
* [Notifications](#notifications)
* [Configuration](#configuration)

## Features:
- [x] A user-friendly customizable work-flow;
- [x] Manual approval/confirmation for staging and production deployments;
- [x] Notifications for pipeline and stage level events.

## Overview
The pipeline has been designed for working with homogeneous projects and the work-flow is comprised of distinct stages that handle the build and deployment processes, for each of the projects defined within the `Microservices` section of the configuration file, in the following sequential order:

1) [Source](#source-stage)
2) [Build](#build-stage)
3) [Setup](#setup-stage)
4) [UT](#unsupervised-testing-ut-stage)
5) [ST](#supervised-testing-st-stage)
6) [UAT](#user-acceptance-testing-uat-stage)
7) [Production](#production-stage)

All of the above mentioned stages are optional and can be disabled, customized or replaced.

## Installation
If you have not already done this then you must download this project locally and install it:
```
git clone --depth 1 https://github.com/RazzM13/scaffold-aws-microservices-codepipeline.git && npm install
```

In order to setup the pipeline we must first configure it and the easiest way of doing so is by tweaking the provided `config.yaml` file to suit your project, perhaps using the following methodology:
1) Decide your project's development work-flow and determine the pre-release stages that a candidate-build must pass in order for it to be deemed production ready and with that in mind, adjust the [Stages](#stages) and [Approvals](#approvals) sections of the configuration file. If you do not want any manual interventions at all then you can simply set `Approvals` to `false`.
Note: You must always take into account that for each additional step in the development process the degree of complexity increases and thus the frequency of new releases diminishes; a best approach to this is probably to start small with just the [UT](#unsupervised-testing-ut-stage) stage for automated testing and add new validation stages as the project expands and team members become specialized.

2) Change the default email addresses of `maillist@example.com` to whatever you prefer and customize the [Notifications](#notifications) section to your heart's content. A notification can be fully disabled by removing the entire entry from the section.

3) Last but not least, you must configure the microservices that will be handled by this pipeline and their respective source-code repositories. The default `config.yaml` file provides some basic example configurations.

This project offers a convenience method for deploying/redeploying the pipeline that makes use of the `StackName` from the `config` section of the `package.json` file thus, it must be configured to point to the desired stack, to which the pipeline will be deployed.

Having configured the pipeline, we can now deploy it by executing `npm install-codepipeline`. The aforementioned command generates an *AWS CloudFormation* template, namely `out.yaml`, and then attempts to validate it using [cfn-lint](https://github.com/martysweet/cfn-lint) and if all goes well then deploys it using the [AWS cli](https://aws.amazon.com/cli/).

## --- TL;DR WARNING ---

## Stacks
The pipeline itself makes use of *AWS CloudFormation* stacks for resource isolation between the various stages.
The [Setup](#setup-stage), [UT](#unsupervised-testing-ut-stage), [ST](#supervised-testing-st-stage), [UAT](#user-acceptance-testing-uat-stage) and [Production](#production-stage) stages deploy *AWS CloudFormation* stacks named in a hyphenated format, according to the `BaseStackName` parameter of the configuration file, followed by a specific microservice name and a suffix of the current stage (e.g. `com-example-api-helloworld1-uat`).
Unlike the [Setup](#setup-stage) and [Production](#production-stage) stages that preserve and update the existing stack, the [UT](#unsupervised-testing-ut-stage), [ST](#supervised-testing-st-stage) and [UAT](#user-acceptance-testing-uat-stage) stages behave in a destructive manner by firstly destroying the existing stack, if present, and then a new stack is created.

### Base-stack
Is an *AWS CloudFormation* stack of *AWS* resources based on the definitions provided for each microservice, in the `cf_base.yaml` files that reside in the artifacts obtained from the [Build](#build-stage) stage.
### Stage-stack
Is an *AWS CloudFormation* stack of *AWS* resources based on the definitions provided for each microservice, in the `cf_stage.yaml` files that reside in the artifacts obtained from the [Build](#build-stage) stage.

## Stages
### Source stage
This stage is responsible for triggering new runs of the pipeline by detecting source-code changes and generating artifacts that will be used as input for the subsequent stages.

### Build stage
The input artifacts, yielded by the [Source](#source-stage) stage, are processed via *AWS CodeBuild*, according to the definitions provided in the `cb_build.yaml` files, and corresponding artifacts are generated to be used within the downstream stages.
It is recommended that unit tests are run within this stage, potentially at the `post_build` phase, so that the pipeline can fail as early as possible and therefore avoid needless processing and delay.

### Setup stage
This stage can be used to deploy and setup a [base-stack](#base-stack) of *AWS* resources via *AWS CloudFormation* that may be referenced in other stages via cross-stack references.

### Unsupervised Testing (UT) stage
At this stage, a [stage-stack](#stage-stack) is deployed and automated testing such as smoke, regression and functional-type tests can be carried out against the resulting resources via *AWS CodeBuild*, as per the definitions provided in the `cb_test.yaml` files of the aforementioned [Source](#source-stage) stage artifacts; the [UT](#unsupervised-testing-ut-stage) stage might be regarded as Pre-Alpha testing.

### Supervised Testing (ST) stage
The [ST](#supervised-testing-st-stage) stage deploys a new [stage-stack](#stage-stack) and, complements the [UT](#unsupervised-testing-ut-stage) stage by allowing additional fine-grained and/or exploratory-type testing to be carried out in a manual/supervised fashion, in an effort to decrease the likelihood of defects in the product; the [ST](#supervised-testing-st-stage) stage can be thought of as Alpha testing.

### User Acceptance Testing (UAT) stage
This stage deploys a new [stage-stack](#stage-stack) and, can be construed as Beta testing or can be used as a means to provide a demonstration of the product as a whole and/or the recently implemented features to the end-client(s) / product owner(s).

### Production stage
After the build has been validated by the previous testing stages then it can be deployed into the production environment, which this stage executes in a non-destructive manner, unlike the [UT](#unsupervised-testing-ut-stage), [ST](#supervised-testing-st-stage) or [UAT](#user-acceptance-testing-uat-stage) stages.

## Manual intervention
The pipeline supports manual approval before exiting the [UT](#unsupervised-testing-ut-stage), [ST](#supervised-testing-st-stage) and [UAT](#user-acceptance-testing-uat-stage) stages and confirmation before entering the [Production](#production-stage) stage. Each of the aforementioned approvals/confirmations are optional and can be enabled/disabled from the configuration file.

## Notifications
The pipeline can configured via the configuration file to send out notifications to a set of subscribers in regards to events at the pipeline level and/or at the stage level.

## Configuration
The pipeline is deployed via an *AWS CloudFormation* template that originates from the rendering of the `template.yaml` file, which is just a *HandleBars* template file that is comprised of various resources and configurations that are needed for the pipeline's functionality; inside the `template.yaml` file, the *HandleBars* context is populated with the contents of the `config.yaml` file.

For the sake of maintaining readability, the stages of the pipeline have been separated from the main file and now reside within the `templates` folder; after *HandleBars* renders each of the templates, a node is attached to the main template, namely `#/templates`, that houses each individual rendered template and can be used to include the rendition anywhere in the main template via `$ref` (e.g. `$ref #/templates/build`).

The pipeline's main configuration files are: `config.yaml`, `cb_build.yaml`, `cb_test.yaml`, `cf_base.yaml` and `cf_stage.yaml`.

The pipeline utilizes `cb_build.yaml` and `cb_test.yaml` files for configuring the `AWS CodeBuild` action of the [Build](#build-stage) and respective [UT](#unsupervised-testing-ut-stage) stages, for each of the configured microservices; this implies that both files be included in the source repository of each microservice. Both the `cb_build.yaml` and `cb_test.yaml` files should be fashioned according to the [Build specification reference](https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html).

In contrast to the `cb_build.yaml` and `cb_test.yaml` files, the `cf_base.yaml` and `cf_stage.yaml` are [AWS CloudFormation templates](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-reference.html) and are expected to be present in the output artifacts of the [Build](#build-stage) stage, this implies that they can be generated at runtime or included within the source repository and exposed as artifacts.

### The `config.yaml` file exposes the following settings:

#### `BaseStackName`:
This is a simple configuration item, whose value is a string and represents the name of the stack that exposes its' resources to be used by other stacks. It is also used as a prefix when stage stacks are created.

#### `Stages`:
Key-value mappings of a stage name that is an alphanumeric string and a boolean value that determines if the particular stage will be included in the pipeline or not.

#### `Approvals`:
Key-value mappings of an approval name that is an alphanumeric string and a boolean value that determines if manual intervention will be required for the pipeline execution to continue beyond the specific step.

#### `Notifications`:
This section is composed of the following items: `PipelineNotification`, `StagingNotification`, `STApproval`, `UATApproval` and `ProductionApproval`.

The `PipelineNotification` and `StagingNotification` handle notifications that occur at the pipeline level or correspondingly, at the stage level and expose the following settings:
- `PipelineNotification`: `DisplayName`, `Subscription` and `States`
- `StagingNotification`: `DisplayName`, `Subscription`, `States` and `Stages`

The `STApproval`, `UATApproval` and `ProductionApproval` notifications trigger when an approval or confirmation is required, as configured in the `Approvals` sections.

##### Configuration options at the notification level:
###### `DisplayName`:
The sender name that will be displayed when a notification arrives.
###### `Subscription`:
Is a list of subscribers that will receive this notification. Each subscriber configuration consists of `Endpoint` and `Protocol` key-value mappings; The `Endpoint` value is usually a phone number or an email address if the value for `Protocol` is either `phone` or respectively `email`, for more information please refer to [this](https://docs.aws.amazon.com/sns/latest/api/API_Subscribe.html).
###### `States`:
Key-value mappings of a state name and a boolean value that determines if the specific state should trigger a notification or not. Permitted state names are: `STARTED`, `SUCCEEDED`, `RESUMED`, `FAILED`, `CANCELED`, `SUPERSEDED`.
###### `Stages`:
Key-value mappings of a stage name and a boolean value that determines if the specific stage should trigger a notification or not. Permitted stage names are all the stage names belonging to the pipeline.

#### `Microservices`:
This section contains the source code repositories for each of the microservices that will built and deployed by the pipeline; it consists of key-value mappings of microservice names and their corresponding repository configurations.
The microservice name should an alphanumeric string whilst, the repository configuration must contain the following keys: `Sources`, `BuildSource` and `TestSource`.

The `Sources` key houses the actual source-code repositories that are being used for building and testing the specific microservice whilst, the `BuildSource` and `TestSource` reflect which of the defined source-code repositories will be used for building and respectively, testing.

Each of the source-code repositories must include a `ActionTypeId` key, that in itself consists of `Category`, `Owner`, `Version`, `Provider` key-values, as well as a `Configuration` key that is comprised of various properties based on the source type; for more information about the supported properties and values, please consult [this](https://docs.aws.amazon.com/codepipeline/latest/userguide/reference-pipeline-structure.html#action-requirements).
