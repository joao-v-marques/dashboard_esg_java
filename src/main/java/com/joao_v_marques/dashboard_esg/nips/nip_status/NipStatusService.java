package com.joao_v_marques.dashboard_esg.nips.nip_status;

import com.joao_v_marques.dashboard_esg.nips.nip_status.dto.NipStatusRequest;
import com.joao_v_marques.dashboard_esg.nips.nip_status.dto.NipStatusResponse;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NipStatusService {

    private final NipStatusRepository nipStatusRepository;

    public NipStatusService(NipStatusRepository nipStatusRepository) {
        this.nipStatusRepository = nipStatusRepository;
    }

    @Transactional(readOnly = true)
    public List<NipStatusResponse> findAll() {
        return nipStatusRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public NipStatusResponse create(NipStatusRequest request) {
        String name = request.name().trim();
        String description = request.description() == null ? null : request.description().trim();

        if (nipStatusRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("O status de NIP que está tentando cadastrar já existe");
        }

        // Montar entidade com base na dto
        NipStatus nipStatus = new NipStatus();
        nipStatus.setName(name);
        nipStatus.setDescription(description);

        NipStatus saved = nipStatusRepository.save(nipStatus);

        return toResponse(saved);
    }

    @Transactional
    public NipStatusResponse update(Integer nipStatusId, NipStatusRequest request) {
        String name = request.name().trim();
        String description = request.description() == null ? null : request.description().trim();

        // Valida se o status editado realmente existe
        NipStatus nipStatus = nipStatusRepository.findById(nipStatusId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum status de NIP com o ID fornecido."));

        if (nipStatusRepository.existsByNameIgnoreCaseAndIdNot(name, nipStatusId)) {
            throw new ConflictException("Já existe outro status de NIP cadastrado com este nome");
        }

        // Atualizar a entidade já existente
        nipStatus.setName(name);
        nipStatus.setDescription(description);

        return toResponse(nipStatus);
    }

    private NipStatusResponse toResponse(NipStatus nipStatus) {
        return new NipStatusResponse(
                nipStatus.getId(),
                nipStatus.getName(),
                nipStatus.getDescription()
        );
    }
}
