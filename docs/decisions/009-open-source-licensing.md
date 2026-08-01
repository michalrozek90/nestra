# 009 — Open-source licensing

## Status

Accepted

## Context

Nestra's source repository is public, but a public repository without a license does not grant
others permission to use, modify, or redistribute its code. The project also needs an
OSI-approved open-source license to qualify for free code signing through SignPath Foundation.

Nestra includes a hosted API as well as installable clients. A permissive license would allow a
third party to build a closed hosted service from the project without publishing its changes.
The selected license should keep improvements to distributed and network-hosted derivatives
available to their users while still permitting commercial use.

## Decision

License Nestra's original source code under the GNU Affero General Public License version 3 only,
using the SPDX identifier `AGPL-3.0-only`.

The repository includes the unmodified license text in its root `LICENSE` file. Package manifests
identify the same license, and the README links to the license and summarizes the network-source
obligation. Third-party dependencies and assets retain their own licenses.

The project may apply separately for SignPath Foundation code signing. This licensing decision
does not claim that SignPath has accepted the project or that current binaries are Authenticode
signed.

## Consequences

- Anyone may use, study, modify, and redistribute Nestra, including commercially, subject to the
  license terms.
- Distributed modified versions must provide corresponding source under AGPL-3.0.
- Modified versions used to provide a network service must offer their corresponding source to
  the users of that service.
- Consumers who need to incorporate Nestra into closed-source derivatives cannot do so under this
  license.
- Adding external code or assets requires checking that their licenses are compatible with
  AGPL-3.0.
- Free SignPath Foundation signing remains subject to its separate eligibility review and
  operational requirements.

## Alternatives considered

- Apache-2.0: rejected because its permissive terms would allow closed-source derivatives and
  hosted services without publication of their modifications.
- Leaving the repository unlicensed: rejected because a public repository alone does not provide
  open-source permissions and does not meet SignPath Foundation's licensing requirement.
