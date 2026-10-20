package com.joao_v_marques.dashboard_esg.nips.nip;

import com.joao_v_marques.dashboard_esg.nips.nip.dto.NipRequest;
import com.joao_v_marques.dashboard_esg.nips.nip.dto.NipResponse;
import com.joao_v_marques.dashboard_esg.nips.nip_status.NipStatus;
import com.joao_v_marques.dashboard_esg.nips.nip_status.NipStatusRepository;
import com.joao_v_marques.dashboard_esg.nips.nips_nature.NipNature;
import com.joao_v_marques.dashboard_esg.nips.nips_nature.NipNatureRepository;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import com.joao_v_marques.dashboard_esg.users.user.User;
import com.joao_v_marques.dashboard_esg.users.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class NipService {

    private final NipRepository nipRepository;
    private final NipStatusRepository nipStatusRepository;
    private final NipNatureRepository nipNatureRepository;
    private final UserRepository userRepository;

    public NipService(NipRepository nipRepository, NipStatusRepository nipStatusRepository, NipNatureRepository nipNatureRepository, UserRepository userRepository) {
        this.nipRepository = nipRepository;
        this.nipStatusRepository = nipStatusRepository;
        this.nipNatureRepository = nipNatureRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<NipResponse> findAll() {
        return nipRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public NipResponse create(NipRequest request, UserPrincipal currentUser) {
        String nipNumber = request.nipNumber().trim();
        String protocolCode = request.protocolCode().trim();
        String description = request.description() != null ? request.description().trim() : null;
        String responseDescription = request.responseDescription() != null ? request.responseDescription().trim() : null;

        // Validações de duplicidade (colunas UNIQUE)
        if (nipRepository.existsByNipNumber(nipNumber)) {
            throw new ConflictException("Já existe uma NIP cadastrada com este número.");
        }
        if (nipRepository.existsByProtocolCode(protocolCode)) {
            throw new ConflictException("Já existe uma NIP cadastrada com este protocolo.");
        }

        // Validação das FK
        NipStatus status = nipStatusRepository.findById(request.statusId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum status de NIP com o ID informado."));
        NipNature nature = nipNatureRepository.findById(request.natureId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma natureza de NIP com o ID informado."));
        User insertedBy = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado usuário com o ID informado."));

        // Transformar a DTO de request em entidade
        Nip nip = new Nip();
        nip.setNipNumber(nipNumber);
        nip.setNotificationDate(request.notificationDate());
        nip.setDemandCode(request.demandCode().trim());
        nip.setProtocolCode(protocolCode);
        nip.setBeneficiaryName(request.beneficiaryName().trim());
        nip.setBeneficiaryCpf(request.beneficiaryCpf());
        nip.setDescription(description);
        nip.setResponseDescription(responseDescription);
        nip.setStatus(status);
        nip.setNature(nature);
        nip.setInsertedBy(insertedBy);

        nipRepository.save(nip);

        return toResponse(nip);
    }

    @Transactional
    public NipResponse update(Integer nipId, NipRequest request, UserPrincipal currentUser) {
        String nipNumber = request.nipNumber().trim();
        String protocolCode = request.protocolCode().trim();
        String description = request.description() != null ? request.description().trim() : null;
        String responseDescription = request.responseDescription() != null ? request.responseDescription().trim() : null;

        // Confirmar se a NIP editada realmente existe
        Nip nip = nipRepository.findById(nipId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma NIP com o ID informado."));

        // Validações de duplicidade, ignorando a própria NIP
        if (nipRepository.existsByNipNumberAndIdNot(nipNumber, nipId)) {
            throw new ConflictException("Já existe outra NIP cadastrada com este número.");
        }
        if (nipRepository.existsByProtocolCodeAndIdNot(protocolCode, nipId)) {
            throw new ConflictException("Já existe outra NIP cadastrada com este protocolo.");
        }

        // Validação das FK
        NipStatus status = nipStatusRepository.findById(request.statusId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum status de NIP com o ID informado."));
        NipNature nature = nipNatureRepository.findById(request.natureId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma natureza de NIP com o ID informado."));
        User updatedBy = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado usuário com o ID informado."));

        // Atualizar a entidade já existente
        nip.setNipNumber(nipNumber);
        nip.setNotificationDate(request.notificationDate());
        nip.setDemandCode(request.demandCode().trim());
        nip.setProtocolCode(protocolCode);
        nip.setBeneficiaryName(request.beneficiaryName().trim());
        nip.setBeneficiaryCpf(request.beneficiaryCpf());
        nip.setDescription(description);
        nip.setResponseDescription(responseDescription);
        nip.setStatus(status);
        nip.setNature(nature);
        nip.setUpdatedAt(OffsetDateTime.now());
        nip.setUpdatedBy(updatedBy);

        return toResponse(nip);
    }

    private NipResponse toResponse(Nip nip) {
        return new NipResponse(
                nip.getId(),
                nip.getNipNumber(),
                nip.getNotificationDate(),
                nip.getDemandCode(),
                nip.getProtocolCode(),
                nip.getBeneficiaryName(),
                nip.getBeneficiaryCpf(),
                nip.getDescription(),
                nip.getResponseDescription(),
                nip.getStatus().getId(),
                nip.getStatus().getName(),
                nip.getNature().getId(),
                nip.getNature().getName(),
                nip.getInsertedBy().getName(),
                nip.getCreatedAt(),
                nip.getUpdatedAt(),
                nip.getUpdatedBy() != null ? nip.getUpdatedBy().getName() : null
        );
    }
}
